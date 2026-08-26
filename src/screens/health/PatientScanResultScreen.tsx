import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { pacientesVacunacionService } from '../../services/pacientesVacunacion.service';

export const PatientScanResultScreen = () => {
  const { id_paciente, grupo } = useLocalSearchParams<{ id_paciente: string; grupo?: string }>();
  const router = useRouter();
  const segments = useSegments();
  const tabGroup = grupo === 'admin' ? 'adminTabs' :
                   grupo === 'health' ? 'healthTabs' :
                   segments[0] === '(adminTabs)' ? 'adminTabs' : 'healthTabs';
  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<any>(null);
  const [dosis, setDosis] = useState<any[]>([]);
  const [catalogo, setCatalogo] = useState<any[]>([]);

  const [showEditPaciente, setShowEditPaciente] = useState(false);
  const [nombreEdit, setNombreEdit] = useState('');
  const [fechaNacEdit, setFechaNacEdit] = useState('');
  const [guardandoPaciente, setGuardandoPaciente] = useState(false);

  const [dosisEdit, setDosisEdit] = useState<any>(null);
  const [fechaAplicEdit, setFechaAplicEdit] = useState('');
  const [loteEdit, setLoteEdit] = useState('');
  const [proximaCitaEdit, setProximaCitaEdit] = useState('');
  const [guardandoDosis, setGuardandoDosis] = useState(false);

  const cargar = useCallback(async () => {
    if (!id_paciente) return;
    setLoading(true);
    try {
      const [pacienteData, { dosis: dosisData, catalogo: catalogoData }] = await Promise.all([
        pacientesVacunacionService.obtenerPaciente({ id_paciente }),
        pacientesVacunacionService.listarDosisDePaciente({ id_paciente }),
      ]);

      setPaciente(pacienteData);
      // El expediente ordena las dosis ascendente por fecha; el servicio las
      // devuelve descendente (para ChildDetailScreen), así que se invierte aquí.
      setDosis([...dosisData].reverse());
      setCatalogo(catalogoData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id_paciente]);

  useEffect(() => { cargar(); }, [cargar]);

  const edadEnMeses = (fechaNac: string, referencia?: string) => {
    const ref = referencia ? new Date(referencia) : new Date();
    const nac = new Date(fechaNac);
    return (ref.getFullYear() - nac.getFullYear()) * 12 + (ref.getMonth() - nac.getMonth());
  };

  const formatMeses = (meses: number) => {
    if (meses === 0) return 'Al nacer';
    if (meses < 12) return `${meses} mes${meses !== 1 ? 'es' : ''}`;
    const anios = Math.floor(meses / 12);
    const rest = meses % 12;
    if (rest === 0) return `${anios} año${anios !== 1 ? 's' : ''}`;
    return `${anios} año${anios !== 1 ? 's' : ''} y ${rest} mes${rest !== 1 ? 'es' : ''}`;
  };

  const calcularEdad = (fechaNac: string) => formatMeses(edadEnMeses(fechaNac));

  const abrirEditarPaciente = () => {
    setNombreEdit(paciente.nombre_completo);
    setFechaNacEdit(paciente.fecha_nacimiento?.slice(0, 10) ?? '');
    setShowEditPaciente(true);
  };

  const guardarPaciente = async () => {
    if (!nombreEdit.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacEdit)) {
      Alert.alert('Datos inválidos', 'Revisa el nombre y que la fecha tenga formato AAAA-MM-DD.');
      return;
    }
    setGuardandoPaciente(true);
    try {
      const actualizado = await pacientesVacunacionService.actualizarPaciente({
        id_paciente,
        nombre_completo: nombreEdit.trim(),
        fecha_nacimiento: fechaNacEdit,
      });
      setPaciente((prev: any) => ({ ...prev, ...actualizado }));
      setShowEditPaciente(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar el cambio.');
    } finally {
      setGuardandoPaciente(false);
    }
  };

  const abrirEditarDosis = (d: any) => {
    setDosisEdit(d);
    setFechaAplicEdit(d.fecha_aplicacion?.slice(0, 10) ?? '');
    setLoteEdit(d.lote ?? '');
    setProximaCitaEdit(d.fecha_vencimiento_proxima?.slice(0, 10) ?? '');
  };

  const guardarDosis = async () => {
    if (!dosisEdit) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaAplicEdit)) {
      Alert.alert('Fecha inválida', 'Usa el formato AAAA-MM-DD.');
      return;
    }
    setGuardandoDosis(true);
    try {
      await pacientesVacunacionService.actualizarDosis({
        id_registro: dosisEdit.id_registro,
        fecha_aplicacion: fechaAplicEdit,
        lote: loteEdit.trim() || null,
        fecha_vencimiento_proxima: proximaCitaEdit && /^\d{4}-\d{2}-\d{2}$/.test(proximaCitaEdit) ? proximaCitaEdit : null,
      });
      setDosisEdit(null);
      cargar();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar el cambio.');
    } finally {
      setGuardandoDosis(false);
    }
  };

  const confirmarEliminarDosis = () => {
    if (!dosisEdit) return;
    Alert.alert(
      'Eliminar dosis',
      `¿Eliminar el registro de "${dosisEdit.cat_vacunas_oficiales?.nombre_enfermedad ?? 'esta vacuna'}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: eliminarDosis },
      ],
    );
  };

  const eliminarDosis = async () => {
    if (!dosisEdit) return;
    setGuardandoDosis(true);
    try {
      await pacientesVacunacionService.eliminarDosis({ id_registro: dosisEdit.id_registro });
      setDosisEdit(null);
      cargar();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar la dosis.');
    } finally {
      setGuardandoDosis(false);
    }
  };

  const vacunasAplicadasIds = new Set(dosis.map((d) => d.cat_vacunas_oficiales?.id_vacuna));
  const pendientes = catalogo.filter((v) => !vacunasAplicadasIds.has(v.id_vacuna));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a281ba" />
      </View>
    );
  }

  if (!paciente) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#553b5e" />
        </TouchableOpacity>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#8e8e99" />
          <Text style={styles.errorText}>Paciente no encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const edadActualMeses = edadEnMeses(paciente.fecha_nacimiento);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expediente del Paciente</Text>
          <TouchableOpacity onPress={abrirEditarPaciente}>
            <Ionicons name="pencil-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Tarjeta paciente */}
        <View style={styles.patientCard}>
          <View style={styles.patientAvatar}>
            <Ionicons name={paciente.sexo === 'F' ? 'woman' : 'man'} size={32} color="#a281ba" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{paciente.nombre_completo}</Text>
            <Text style={styles.patientDetail}>{calcularEdad(paciente.fecha_nacimiento)}</Text>
            {paciente.usuarios && (
              <Text style={styles.patientTutor}>Tutor: {paciente.usuarios.nombre_completo}</Text>
            )}
          </View>
          <View style={styles.badges}>
            {paciente.es_embarazada && (
              <View style={styles.badge}>
                <Ionicons name="heart" size={12} color="white" />
                <Text style={styles.badgeText}>Embarazada</Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
              <Ionicons name="checkmark-shield" size={12} color="white" />
              <Text style={styles.badgeText}>{dosis.length} dosis</Text>
            </View>
            {pendientes.length > 0 && (
              <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="alert-circle" size={12} color="white" />
                <Text style={styles.badgeText}>{pendientes.length} pend.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Botón registrar */}
        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() =>
            router.push({ pathname: `/(${tabGroup})/register-dose` as any, params: { id_paciente: paciente.id_paciente, grupo } })
          }
        >
          <Ionicons name="add-circle" size={20} color="white" />
          <Text style={styles.registerBtnText}>Agregar nueva dosis</Text>
        </TouchableOpacity>

        {/* Vacunas pendientes */}
        {pendientes.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>
              Pendientes del esquema PAI ({pendientes.length})
            </Text>
            {pendientes.map((v) => {
              const vencida = edadActualMeses > v.edad_meses_ideal;
              const faltanMeses = v.edad_meses_ideal - edadActualMeses;
              return (
                <View key={v.id_vacuna} style={[styles.vacunaRow, vencida ? styles.vencidaRow : styles.pendienteRow]}>
                  <View style={[styles.vacunaIcon, { backgroundColor: vencida ? '#FEE2E2' : '#FEF3C7' }]}>
                    <Ionicons
                      name={vencida ? 'warning-outline' : 'time-outline'}
                      size={16}
                      color={vencida ? '#EF4444' : '#F59E0B'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vacunaNombre}>{v.nombre_enfermedad}</Text>
                    <Text style={styles.vacunaDosis}>{v.dosis_numero}</Text>
                    <Text style={[styles.edadTag, vencida ? styles.edadTagVencida : styles.edadTagPendiente]}>
                      {vencida
                        ? `Atrasada · debía aplicarse a los ${formatMeses(v.edad_meses_ideal)}`
                        : faltanMeses === 0
                          ? `Recomendada este mes (${formatMeses(v.edad_meses_ideal)})`
                          : `A los ${formatMeses(v.edad_meses_ideal)} · faltan ${faltanMeses} mes${faltanMeses !== 1 ? 'es' : ''}`}
                    </Text>
                  </View>
                  <Ionicons
                    name={vencida ? 'alert-circle' : 'alert-circle-outline'}
                    size={18}
                    color={vencida ? '#EF4444' : '#F59E0B'}
                  />
                </View>
              );
            })}
          </>
        )}

        {/* Vacunas aplicadas */}
        <Text style={styles.sectionLabel}>
          Historial de vacunación ({dosis.length})
        </Text>
        {dosis.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>Sin dosis registradas</Text>
          </View>
        ) : (
          dosis.map((d) => {
            const edadAlAplicar = edadEnMeses(paciente.fecha_nacimiento, d.fecha_aplicacion);
            return (
              <TouchableOpacity key={d.id_registro} style={styles.vacunaRow} onPress={() => abrirEditarDosis(d)}>
                <View style={[styles.vacunaIcon, { backgroundColor: 'rgba(162,129,186,0.1)' }]}>
                  <Ionicons name="shield-checkmark" size={16} color="#a281ba" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vacunaNombre}>
                    {d.cat_vacunas_oficiales?.nombre_enfermedad ?? 'Vacuna'}
                  </Text>
                  <Text style={styles.vacunaDosis}>
                    {d.cat_vacunas_oficiales?.dosis_numero}
                    {d.lote ? ` · Lote: ${d.lote}` : ''}
                  </Text>
                  <Text style={styles.edadAplicacion}>
                    A los {formatMeses(edadAlAplicar)} de edad
                    {d.origen_registro === 'Migrado_Cartilla_Fisica' ? ' · Cartilla física' : ''}
                  </Text>
                </View>
                <Text style={styles.vacunaFecha}>
                  {new Date(d.fecha_aplicacion).toLocaleDateString('es-BO', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </Text>
                <Ionicons name="pencil-outline" size={14} color="#D1D5DB" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal editar paciente */}
      <Modal visible={showEditPaciente} animationType="slide" transparent onRequestClose={() => setShowEditPaciente(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar paciente</Text>
              <TouchableOpacity onPress={() => setShowEditPaciente(false)}>
                <Ionicons name="close" size={24} color="#553b5e" />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Nombre completo</Text>
            <TextInput style={styles.input} value={nombreEdit} onChangeText={setNombreEdit} autoCapitalize="words" />
            <Text style={styles.fieldLabel}>Fecha de nacimiento (AAAA-MM-DD)</Text>
            <TextInput style={styles.input} value={fechaNacEdit} onChangeText={setFechaNacEdit} keyboardType="numbers-and-punctuation" />
            <TouchableOpacity
              style={[styles.saveModalBtn, guardandoPaciente && { opacity: 0.6 }]}
              onPress={guardarPaciente}
              disabled={guardandoPaciente}
            >
              {guardandoPaciente ? <ActivityIndicator color="white" /> : <Text style={styles.saveModalBtnText}>Guardar cambios</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal editar/eliminar dosis */}
      <Modal visible={!!dosisEdit} animationType="slide" transparent onRequestClose={() => setDosisEdit(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Corregir dosis</Text>
              <TouchableOpacity onPress={() => setDosisEdit(null)}>
                <Ionicons name="close" size={24} color="#553b5e" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalVacunaNombre}>{dosisEdit?.cat_vacunas_oficiales?.nombre_enfermedad}</Text>

            <Text style={styles.fieldLabel}>Fecha de aplicación (AAAA-MM-DD)</Text>
            <TextInput style={styles.input} value={fechaAplicEdit} onChangeText={setFechaAplicEdit} keyboardType="numbers-and-punctuation" />

            <Text style={styles.fieldLabel}>Número de lote</Text>
            <TextInput style={styles.input} value={loteEdit} onChangeText={setLoteEdit} placeholder="Opcional" placeholderTextColor="#8e8e99" />

            <Text style={styles.fieldLabel}>Próxima cita (AAAA-MM-DD)</Text>
            <TextInput style={styles.input} value={proximaCitaEdit} onChangeText={setProximaCitaEdit} placeholder="Opcional" placeholderTextColor="#8e8e99" keyboardType="numbers-and-punctuation" />

            <TouchableOpacity
              style={[styles.saveModalBtn, guardandoDosis && { opacity: 0.6 }]}
              onPress={guardarDosis}
              disabled={guardandoDosis}
            >
              {guardandoDosis ? <ActivityIndicator color="white" /> : <Text style={styles.saveModalBtnText}>Guardar cambios</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteModalBtn} onPress={confirmarEliminarDosis} disabled={guardandoDosis}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={styles.deleteModalBtnText}>Eliminar esta dosis</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#8e8e99', marginTop: 12 },
  backBtn: { padding: 20 },
  headerBar: {
    backgroundColor: '#553b5e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTitle: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  patientCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  patientAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(162,129,186,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  patientName: { fontSize: 17, fontWeight: 'bold', color: '#553b5e' },
  patientDetail: { fontSize: 13, color: '#8e8e99', marginTop: 3 },
  patientTutor: { fontSize: 12, color: '#8e8e99', marginTop: 3 },
  badges: { gap: 6, alignItems: 'flex-end' },
  badge: {
    flexDirection: 'row', gap: 4, alignItems: 'center',
    backgroundColor: '#a281ba',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  badgeText: { color: 'white', fontSize: 11, fontWeight: '700' },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#a281ba',
    marginHorizontal: 16, marginBottom: 4, borderRadius: 14,
    paddingVertical: 15, paddingHorizontal: 20,
  },
  registerBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#8e8e99',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginHorizontal: 16, marginTop: 20, marginBottom: 10,
  },
  vacunaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  pendienteRow: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  vencidaRow: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  vacunaIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  vacunaNombre: { fontSize: 14, fontWeight: '700', color: '#553b5e' },
  vacunaDosis: { fontSize: 12, color: '#8e8e99', marginTop: 2 },
  edadTag: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  edadTagPendiente: { color: '#D97706' },
  edadTagVencida: { color: '#DC2626' },
  edadAplicacion: { fontSize: 11, color: '#6B7280', marginTop: 3 },
  vacunaFecha: { fontSize: 11, color: '#8e8e99', textAlign: 'right', minWidth: 60 },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: '#8e8e99', marginTop: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#553b5e' },
  modalVacunaNombre: { fontSize: 13, color: '#8e8e99', marginBottom: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#8e8e99', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    backgroundColor: '#F8F9FA', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#553b5e',
  },
  saveModalBtn: {
    backgroundColor: '#a281ba', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 20,
  },
  saveModalBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  deleteModalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 14, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#FEE2E2',
  },
  deleteModalBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
});
