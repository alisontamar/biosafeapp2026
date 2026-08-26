import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, Modal, TextInput, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { pacientesVacunacionService } from '../../services/pacientesVacunacion.service';
import { QRModal } from '../../components/QRModal';
import { CarnetUploadModal } from '../../components/CarnetUploadModal';

type VaccineRecord = {
  id_registro: string;
  fecha_aplicacion: string;
  fecha_vencimiento_proxima: string | null;
  lote: string | null;
  nombre_vacuna: string;
  dosis_numero: string;
  status: 'applied' | 'pending';
};

export const ChildDetailScreen = () => {
  const params = useLocalSearchParams();
  // id puede venir como string o string[] — lo normalizamos
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState<any>(null);
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [catalogEmpty, setCatalogEmpty] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'applied'>('pending');
  const [showQR, setShowQR] = useState(false);
  const [showCarnet, setShowCarnet] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [nombreEdit, setNombreEdit] = useState('');
  const [fechaEdit, setFechaEdit] = useState('');
  const [sexoEdit, setSexoEdit] = useState<'M' | 'F'>('M');
  const [embarazadaEdit, setEmbarazadaEdit] = useState(false);
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  useEffect(() => {
    if (id) cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      let paciente: any;
      try {
        paciente = await pacientesVacunacionService.obtenerPaciente({ id_paciente: id });
      } catch {
        Alert.alert('Error', 'No se encontró el paciente.');
        router.back();
        return;
      }
      setChild(paciente);

      const { dosis, catalogo } = await pacientesVacunacionService.listarDosisDePaciente({ id_paciente: id });

      if (catalogo.length === 0) setCatalogEmpty(true);

      const appliedNames = new Set(
        dosis
          .map((d: any) => d.cat_vacunas_oficiales?.nombre_enfermedad)
          .filter(Boolean)
      );

      const records: VaccineRecord[] = [];

      dosis.forEach((d: any) => {
        records.push({
          id_registro: d.id_registro,
          fecha_aplicacion: d.fecha_aplicacion,
          fecha_vencimiento_proxima: d.fecha_vencimiento_proxima,
          lote: d.lote,
          nombre_vacuna: d.cat_vacunas_oficiales?.nombre_enfermedad ?? 'Vacuna',
          dosis_numero: d.cat_vacunas_oficiales?.dosis_numero ?? '',
          status: 'applied',
        });
      });

      catalogo.forEach((v: any) => {
        if (!appliedNames.has(v.nombre_enfermedad)) {
          records.push({
            id_registro: v.id_vacuna,
            fecha_aplicacion: '',
            fecha_vencimiento_proxima: null,
            lote: null,
            nombre_vacuna: v.nombre_enfermedad,
            dosis_numero: v.dosis_numero,
            status: 'pending',
          });
        }
      });

      setVaccines(records);
    } catch (err) {
      console.error('Error cargando detalle:', err);
    } finally {
      setLoading(false);
    }
  };

  const abrirEdicion = () => {
    if (!child) return;
    setNombreEdit(child.nombre_completo);
    setFechaEdit(child.fecha_nacimiento?.slice(0, 10) ?? '');
    setSexoEdit(child.sexo);
    setEmbarazadaEdit(!!child.es_embarazada);
    setShowEdit(true);
  };

  const guardarEdicion = async () => {
    if (!nombreEdit.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(fechaEdit)) {
      Alert.alert('Datos inválidos', 'Revisa el nombre y que la fecha tenga formato AAAA-MM-DD.');
      return;
    }
    setGuardandoEdit(true);
    try {
      const actualizado = await pacientesVacunacionService.actualizarPaciente({
        id_paciente: id,
        nombre_completo: nombreEdit.trim(),
        fecha_nacimiento: fechaEdit,
        sexo: sexoEdit,
        es_embarazada: sexoEdit === 'F' ? embarazadaEdit : false,
      });
      setChild((prev: any) => ({ ...prev, ...actualizado }));
      setShowEdit(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar el cambio.');
    } finally {
      setGuardandoEdit(false);
    }
  };

  const calcularEdad = (fechaNac: string) => {
    const hoy = new Date();
    const nac = new Date(fechaNac);
    const meses =
      (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth());
    if (meses < 12) return `${meses} meses`;
    const años = Math.floor(meses / 12);
    const resto = meses % 12;
    return resto > 0 ? `${años} años ${resto} meses` : `${años} años`;
  };

  const filtered = vaccines.filter((v) => v.status === activeTab);
  const pendingCount = vaccines.filter((v) => v.status === 'pending').length;
  const appliedCount = vaccines.filter((v) => v.status === 'applied').length;

  const renderVaccine = ({ item }: { item: VaccineRecord }) => (
    <View style={styles.vaccineCard}>
      <View style={[
        styles.vaccineIconWrap,
        { backgroundColor: item.status === 'applied' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' },
      ]}>
        <Ionicons
          name={item.status === 'applied' ? 'checkmark-circle' : 'time-outline'}
          size={22}
          color={item.status === 'applied' ? colors.success : colors.warning}
        />
      </View>
      <View style={styles.vaccineInfo}>
        <Text style={styles.vaccineName}>{item.nombre_vacuna}</Text>
        <Text style={styles.vaccineDosis}>{item.dosis_numero}</Text>
        {item.status === 'applied' && item.fecha_aplicacion ? (
          <Text style={styles.vaccineDate}>
            Aplicada el {new Date(item.fecha_aplicacion).toLocaleDateString('es-BO', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </Text>
        ) : (
          <Text style={[styles.vaccineDate, { color: colors.warning }]}>Pendiente de aplicación</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expediente</Text>
        <TouchableOpacity style={styles.qrHeaderBtn} onPress={() => setShowQR(true)}>
          <Ionicons name="qr-code-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Perfil del paciente */}
      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Ionicons
            name={child?.sexo === 'F' ? 'woman' : 'man'}
            size={36}
            color={colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.childName}>{child?.nombre_completo}</Text>
          <Text style={styles.childAge}>{calcularEdad(child?.fecha_nacimiento)}</Text>
        </View>
        <TouchableOpacity style={styles.editHeaderBtn} onPress={abrirEdicion}>
          <Ionicons name="pencil-outline" size={16} color={colors.tertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.carnetHeaderBtn} onPress={() => setShowCarnet(true)}>
          <Ionicons name="camera-outline" size={18} color={colors.tertiary} />
          <Text style={styles.carnetHeaderBtnText}>Carnet</Text>
        </TouchableOpacity>
      </View>

      {/* Contadores */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.success }]}>{appliedCount}</Text>
          <Text style={styles.statLabel}>Aplicadas</Text>
        </View>
        <View style={[styles.statBox, { borderLeftWidth: 1, borderLeftColor: '#E5E7EB' }]}>
          <Text style={[styles.statNum, { color: colors.warning }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pendientes {pendingCount > 0 ? `(${pendingCount})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'applied' && styles.tabActive]}
          onPress={() => setActiveTab('applied')}
        >
          <Text style={[styles.tabText, activeTab === 'applied' && styles.tabTextActive]}>
            Aplicadas {appliedCount > 0 ? `(${appliedCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de vacunas */}
      {filtered.length === 0 ? (
        <View style={styles.center}>
          {catalogEmpty ? (
            <>
              <Ionicons name="server-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Catálogo de vacunas vacío</Text>
              <Text style={styles.emptyDesc}>
                El administrador aún no ha cargado el esquema de vacunación al sistema.
              </Text>
            </>
          ) : activeTab === 'pending' ? (
            <>
              <Ionicons name="checkmark-done-circle" size={56} color={colors.success} />
              <Text style={styles.emptyTitle}>¡Todo al día!</Text>
              <Text style={styles.emptyDesc}>No hay vacunas pendientes para este paciente.</Text>
            </>
          ) : (
            <>
              <Ionicons name="document-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Sin registro de dosis</Text>
              <Text style={styles.emptyDesc}>No hay vacunas aplicadas registradas en el sistema aún.</Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderVaccine}
          keyExtractor={(item) => item.id_registro}
          contentContainerStyle={styles.listPadding}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtnSecondary} onPress={() => setShowCarnet(true)}>
          <Ionicons name="camera-outline" size={19} color={colors.primary} />
          <Text style={styles.footerBtnSecondaryText}>Carnet Físico</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerBtnPrimary} onPress={() => setShowQR(true)}>
          <Ionicons name="qr-code-outline" size={19} color="white" />
          <Text style={styles.footerBtnPrimaryText}>Ver QR</Text>
        </TouchableOpacity>
      </View>

      <QRModal visible={showQR} onClose={() => setShowQR(false)} paciente={child} />

      {child && (
        <CarnetUploadModal
          visible={showCarnet}
          onClose={() => setShowCarnet(false)}
          idPaciente={child.id_paciente}
          nombrePaciente={child.nombre_completo}
        />
      )}

      {/* Modal editar datos del paciente */}
      <Modal visible={showEdit} animationType="slide" transparent onRequestClose={() => setShowEdit(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar datos</Text>
              <TouchableOpacity onPress={() => setShowEdit(false)}>
                <Ionicons name="close" size={24} color={colors.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Nombre completo</Text>
            <TextInput style={styles.input} value={nombreEdit} onChangeText={setNombreEdit} autoCapitalize="words" />

            <Text style={styles.fieldLabel}>Fecha de nacimiento (AAAA-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={fechaEdit}
              onChangeText={setFechaEdit}
              keyboardType="numbers-and-punctuation"
              placeholder="AAAA-MM-DD"
            />

            <Text style={styles.fieldLabel}>Sexo</Text>
            <View style={styles.sexoRow}>
              <TouchableOpacity
                style={[styles.sexoBtn, sexoEdit === 'M' && styles.sexoBtnActive]}
                onPress={() => { setSexoEdit('M'); setEmbarazadaEdit(false); }}
              >
                <Text style={[styles.sexoText, sexoEdit === 'M' && styles.sexoTextActive]}>Masculino</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sexoBtn, sexoEdit === 'F' && styles.sexoBtnActive]}
                onPress={() => setSexoEdit('F')}
              >
                <Text style={[styles.sexoText, sexoEdit === 'F' && styles.sexoTextActive]}>Femenino</Text>
              </TouchableOpacity>
            </View>

            {sexoEdit === 'F' && (
              <View style={styles.embarazadaRow}>
                <Text style={styles.fieldLabel2}>¿Está embarazada actualmente?</Text>
                <Switch
                  value={embarazadaEdit}
                  onValueChange={setEmbarazadaEdit}
                  trackColor={{ false: '#E5E7EB', true: '#fbcfe8' }}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveEditBtn, guardandoEdit && { opacity: 0.6 }]}
              onPress={guardarEdicion}
              disabled={guardandoEdit}
            >
              {guardandoEdit ? <ActivityIndicator color="white" /> : <Text style={styles.saveEditBtnText}>Guardar cambios</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.secondary },
  qrHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(162,128,185,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(162,128,185,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childName: { fontSize: 18, fontWeight: 'bold', color: colors.secondary },
  childAge: { fontSize: 13, color: colors.tertiary, marginTop: 2 },
  carnetHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  carnetHeaderBtnText: { fontSize: 12, color: colors.tertiary, fontWeight: '600' },
  editHeaderBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNum: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: colors.tertiary, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.tertiary },
  tabTextActive: { color: colors.primary },

  listPadding: { padding: 16, paddingBottom: 120 },
  vaccineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  vaccineIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaccineInfo: { flex: 1 },
  vaccineName: { fontSize: 15, fontWeight: '700', color: colors.secondary, marginBottom: 2 },
  vaccineDosis: { fontSize: 12, color: colors.tertiary, marginBottom: 2 },
  vaccineDate: { fontSize: 12, color: colors.tertiary },

  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.secondary, marginTop: 14, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: colors.tertiary, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  footerBtnSecondaryText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  footerBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  footerBtnPrimaryText: { color: 'white', fontWeight: '700', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.secondary },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.tertiary, marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldLabel2: { fontSize: 14, fontWeight: '600', color: colors.secondary, flex: 1 },
  input: {
    backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.secondary,
  },
  sexoRow: { flexDirection: 'row', gap: 10 },
  sexoBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E5E7EB',
  },
  sexoBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sexoText: { fontSize: 13, fontWeight: '600', color: colors.tertiary },
  sexoTextActive: { color: 'white' },
  embarazadaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, padding: 14, backgroundColor: '#fdf2f8', borderRadius: 12,
  },
  saveEditBtn: {
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 24,
  },
  saveEditBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
