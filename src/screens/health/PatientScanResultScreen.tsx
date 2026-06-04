import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors } from '../../theme/colors';

export const PatientScanResultScreen = () => {
  const { id_paciente } = useLocalSearchParams<{ id_paciente: string }>();
  const router = useRouter();
  const segments = useSegments();
  const tabGroup = segments[0] === '(adminTabs)' ? '(adminTabs)' : '(healthTabs)';
  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<any>(null);
  const [dosis, setDosis] = useState<any[]>([]);
  const [catalogo, setCatalogo] = useState<any[]>([]);

  const cargar = useCallback(async () => {
    if (!id_paciente) return;
    setLoading(true);
    try {
      const [resPaciente, resDosis, resCatalogo] = await Promise.all([
        supabase
          .from('pacientes')
          .select('*, usuarios(nombre_completo, correo_electronico)')
          .eq('id_paciente', id_paciente)
          .single(),
        supabase
          .from('dosis_aplicadas')
          .select(`
            id_registro, fecha_aplicacion, lote, origen_registro,
            cat_vacunas_oficiales ( id_vacuna, nombre_enfermedad, dosis_numero )
          `)
          .eq('id_paciente', id_paciente)
          .order('fecha_aplicacion', { ascending: false }),
        supabase
          .from('cat_vacunas_oficiales')
          .select('*')
          .order('edad_meses_ideal', { ascending: true }),
      ]);

      if (resPaciente.data) setPaciente(resPaciente.data);
      setDosis(resDosis.data ?? []);
      setCatalogo(resCatalogo.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id_paciente]);

  useEffect(() => { cargar(); }, [cargar]);

  const calcularEdad = (fechaNac: string) => {
    const hoy = new Date();
    const nac = new Date(fechaNac);
    const meses = (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth());
    if (meses < 12) return `${meses} meses`;
    const anios = Math.floor(meses / 12);
    const mesesRest = meses % 12;
    return mesesRest > 0 ? `${anios} años y ${mesesRest} meses` : `${anios} años`;
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expediente del Paciente</Text>
          <View style={{ width: 22 }} />
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
          </View>
        </View>

        {/* Botón registrar */}
        <TouchableOpacity
          style={styles.registerBtn}
          onPress={() =>
            router.push({ pathname: `/(${tabGroup})/register-dose` as any, params: { id_paciente: paciente.id_paciente } })
          }
        >
          <Ionicons name="add-circle" size={20} color="white" />
          <Text style={styles.registerBtnText}>Registrar nueva dosis</Text>
        </TouchableOpacity>

        {/* Vacunas pendientes */}
        {pendientes.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Pendientes del esquema PAI</Text>
            {pendientes.map((v) => (
              <View key={v.id_vacuna} style={[styles.vacunaRow, styles.pendienteRow]}>
                <View style={[styles.vacunaIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="time-outline" size={16} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vacunaNombre}>{v.nombre_enfermedad}</Text>
                  <Text style={styles.vacunaDosis}>{v.dosis_numero} · A los {v.edad_meses_ideal} meses</Text>
                </View>
                <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
              </View>
            ))}
          </>
        )}

        {/* Vacunas aplicadas */}
        <Text style={styles.sectionLabel}>Historial de vacunación</Text>
        {dosis.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>Sin dosis registradas</Text>
          </View>
        ) : (
          dosis.map((d) => (
            <View key={d.id_registro} style={styles.vacunaRow}>
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
                  {d.origen_registro === 'Migrado_Cartilla_Fisica' ? ' · Cartilla física' : ''}
                </Text>
              </View>
              <Text style={styles.vacunaFecha}>
                {new Date(d.fecha_aplicacion).toLocaleDateString('es-BO', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  vacunaIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  vacunaNombre: { fontSize: 14, fontWeight: '700', color: '#553b5e' },
  vacunaDosis: { fontSize: 12, color: '#8e8e99', marginTop: 2 },
  vacunaFecha: { fontSize: 11, color: '#8e8e99' },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, color: '#8e8e99', marginTop: 10 },
});
