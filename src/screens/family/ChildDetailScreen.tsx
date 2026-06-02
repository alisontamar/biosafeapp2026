import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
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
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState<any>(null);
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'applied' | 'pending'>('pending');
  const [showQR, setShowQR] = useState(false);
  const [showCarnet, setShowCarnet] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const { data: paciente } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id_paciente', id)
        .single();

      if (!paciente) { Alert.alert('Error', 'Paciente no encontrado'); router.back(); return; }
      setChild(paciente);

      const { data: dosis } = await supabase
        .from('dosis_aplicadas')
        .select(`
          id_registro,
          fecha_aplicacion,
          fecha_vencimiento_proxima,
          lote,
          cat_vacunas_oficiales ( nombre_enfermedad, dosis_numero )
        `)
        .eq('id_paciente', id)
        .order('fecha_aplicacion', { ascending: false });

      const { data: catalogo } = await supabase
        .from('cat_vacunas_oficiales')
        .select('*')
        .order('edad_meses_ideal', { ascending: true });

      const appliedSet = new Set((dosis || []).map((d: any) => d.cat_vacunas_oficiales?.nombre_enfermedad));

      const records: VaccineRecord[] = [];

      (dosis || []).forEach((d: any) => {
        records.push({
          id_registro: d.id_registro,
          fecha_aplicacion: d.fecha_aplicacion,
          fecha_vencimiento_proxima: d.fecha_vencimiento_proxima,
          lote: d.lote,
          nombre_vacuna: d.cat_vacunas_oficiales?.nombre_enfermedad || 'Vacuna',
          dosis_numero: d.cat_vacunas_oficiales?.dosis_numero || '',
          status: 'applied',
        });
      });

      (catalogo || []).forEach((v: any) => {
        if (!appliedSet.has(v.nombre_enfermedad)) {
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
    } catch (error) {
      console.error('Error cargando detalle:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularEdad = (fechaNac: string) => {
    const hoy = new Date();
    const nac = new Date(fechaNac);
    const meses = (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth());
    if (meses < 12) return `${meses} meses`;
    const años = Math.floor(meses / 12);
    return `${años} años`;
  };

  const filteredVaccines = vaccines.filter(v => v.status === activeTab);

  const renderVaccine = ({ item }: { item: VaccineRecord }) => (
    <Card style={styles.vaccineCard}>
      <View style={styles.vaccineInfo}>
        <Text style={styles.vaccineName}>{item.nombre_vacuna}</Text>
        <Text style={styles.vaccineDosis}>{item.dosis_numero}</Text>
        <Text style={styles.vaccineDate}>
          {item.status === 'applied'
            ? `Aplicada: ${new Date(item.fecha_aplicacion).toLocaleDateString()}`
            : 'Pendiente'}
        </Text>
      </View>
      <Ionicons
        name={item.status === 'applied' ? "checkmark-circle" : "time-outline"}
        size={28}
        color={item.status === 'applied' ? colors.success : colors.warning}
      />
    </Card>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expediente Médico</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarLarge}>
          <Ionicons name="happy" size={48} color={colors.primary} />
        </View>
        <Text style={styles.childName}>{child?.nombre_completo}</Text>
        <Text style={styles.childId}>{calcularEdad(child?.fecha_nacimiento)}</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pendientes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'applied' && styles.activeTab]}
          onPress={() => setActiveTab('applied')}
        >
          <Text style={[styles.tabText, activeTab === 'applied' && styles.activeTabText]}>Aplicadas</Text>
        </TouchableOpacity>
      </View>

      {filteredVaccines.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name={activeTab === 'pending' ? "checkmark-done" : "calendar-outline"}
            size={48}
            color={colors.tertiary}
          />
          <Text style={styles.emptyText}>
            {activeTab === 'pending' ? '¡Todo al día! Sin vacunas pendientes.' : 'No hay vacunas aplicadas aún.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredVaccines}
          renderItem={renderVaccine}
          keyExtractor={item => item.id_registro}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.actionFooter}>
        <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => setShowCarnet(true)}>
          <Ionicons name="camera-outline" size={20} color={colors.primary} />
          <Text style={styles.actionButtonTextSecondary}>Carnet Físico</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonPrimary} onPress={() => setShowQR(true)}>
          <Ionicons name="qr-code-outline" size={20} color={colors.background} />
          <Text style={styles.actionButtonTextPrimary}>Ver QR</Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.secondary },
  profileSection: { alignItems: 'center', marginBottom: 24 },
  avatarLarge: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  childName: { fontSize: 24, fontWeight: 'bold', color: colors.secondary },
  childId: { fontSize: 16, color: colors.tertiary, marginTop: 4 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#E5E7EB' },
  activeTab: { borderBottomColor: colors.primary },
  tabText: { fontSize: 16, color: colors.tertiary, fontWeight: '600' },
  activeTabText: { color: colors.primary },
  listContainer: { paddingHorizontal: 24, paddingBottom: 100 },
  vaccineCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  vaccineInfo: { flex: 1 },
  vaccineName: { fontSize: 16, fontWeight: 'bold', color: colors.secondary, marginBottom: 2 },
  vaccineDosis: { fontSize: 13, color: colors.tertiary, marginBottom: 2 },
  vaccineDate: { fontSize: 14, color: colors.tertiary },
  emptyText: { fontSize: 16, color: colors.tertiary, textAlign: 'center', marginTop: 16 },
  actionFooter: { flexDirection: 'row', padding: 24, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 12 },
  actionButtonSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.primary },
  actionButtonTextSecondary: { color: colors.primary, fontWeight: 'bold', marginLeft: 8 },
  actionButtonPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, backgroundColor: colors.primary },
  actionButtonTextPrimary: { color: colors.background, fontWeight: 'bold', marginLeft: 8 },
});
