import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { pacientesVacunacionService } from '../../services/pacientesVacunacion.service';
import { usuariosService } from '../../services/usuarios.service';
import { colors } from '../../theme/colors';
import { LABEL_ROL, RolUsuario } from '../../types';

const PRIMARY = '#a281ba';
const PRIMARY_DARK = '#8f6faa';

export const HealthDashboardScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState({ hoy: 0, dosisHoy: 0, mes: 0 });
  const [recientes, setRecientes] = useState<any[]>([]);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [vacunaSeleccionada, setVacunaSeleccionada] = useState<any>(null);
  const [showCatalogo, setShowCatalogo] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const perfil = await usuariosService.obtenerPerfil();
      if (!perfil) return;
      setUserData(perfil);

      const [estadisticas, catalogo] = await Promise.all([
        pacientesVacunacionService.obtenerEstadisticasAtencion(),
        pacientesVacunacionService.listarCatalogoVacunas(),
      ]);

      setStats({ hoy: estadisticas.hoy, dosisHoy: estadisticas.hoy, mes: estadisticas.mes });
      setRecientes(estadisticas.recientes);
      setCatalogo(catalogo);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  const nombre = userData?.nombre_completo?.split(' ')[0] ?? 'Usuario';
  const rol = LABEL_ROL[userData?.rol as RolUsuario] ?? userData?.rol;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={['#553b5e', '#2d1f3d']} style={styles.header}>
          <View>
            <Text style={styles.headerSub}>{rol}</Text>
            <Text style={styles.headerName}>Hola, {nombre}</Text>
          </View>
          <TouchableOpacity onPress={async () => { await supabase.auth.signOut(); router.replace('/login'); }}>
            <Ionicons name="log-out-outline" size={24} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Vacunación rápida ── */}
        <View style={styles.quickSection}>
          <Text style={styles.quickTitle}>Vacunación rápida</Text>
          <Text style={styles.quickSubtitle}>
            Selecciona una vacuna para registrarla al escanear, o escanea directamente para ver el historial del paciente
          </Text>

          {/* Selector de vacuna */}
          <TouchableOpacity style={styles.vacunaPicker} onPress={() => setShowCatalogo(true)}>
            <View style={styles.vacunaPickerLeft}>
              <View style={[styles.vacunaPickerIcon, vacunaSeleccionada && { backgroundColor: PRIMARY }]}>
                <Ionicons name="medical" size={18} color={vacunaSeleccionada ? 'white' : '#8e8e99'} />
              </View>
              <View>
                {vacunaSeleccionada ? (
                  <>
                    <Text style={styles.vacunaPickerSelected}>{vacunaSeleccionada.nombre_enfermedad}</Text>
                    <Text style={styles.vacunaPickerDosis}>{vacunaSeleccionada.dosis_numero}</Text>
                  </>
                ) : (
                  <Text style={styles.vacunaPickerPlaceholder}>Seleccionar vacuna del catálogo PAI</Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-down" size={18} color="#8e8e99" />
          </TouchableOpacity>

          {/* Botones de acción */}
          <View style={styles.quickBtnsRow}>
            <TouchableOpacity
              style={[styles.quickScanBtn, !vacunaSeleccionada && styles.quickScanBtnDisabled]}
              disabled={!vacunaSeleccionada}
              onPress={() =>
                router.push({
                  pathname: '/(healthTabs)/quick-scan',
                  params: {
                    id_vacuna: vacunaSeleccionada.id_vacuna,
                    nombre_vacuna: vacunaSeleccionada.nombre_enfermedad,
                    dosis_numero: vacunaSeleccionada.dosis_numero,
                  },
                })
              }
            >
              <Ionicons name="qr-code-outline" size={18} color="white" />
              <Text style={styles.quickScanBtnText}>
                {vacunaSeleccionada ? 'Escanear y registrar' : 'Selecciona vacuna primero'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scanOnlyBtn}
              onPress={() => router.push({ pathname: '/(healthTabs)/scanner', params: { grupo: 'health' } })}
            >
              <Ionicons name="scan-outline" size={16} color={PRIMARY} />
              <Text style={styles.scanOnlyBtnText}>Ver historial</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <Text style={styles.sectionLabel}>Actividad de hoy</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="color-fill" size={22} color={PRIMARY} />
            <Text style={styles.statNum}>{stats.dosisHoy}</Text>
            <Text style={styles.statLabel}>Dosis{'\n'}aplicadas</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people" size={22} color="#10B981" />
            <Text style={styles.statNum}>{stats.hoy}</Text>
            <Text style={styles.statLabel}>Pacientes{'\n'}atendidos</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={22} color="#F59E0B" />
            <Text style={styles.statNum}>{stats.mes}</Text>
            <Text style={styles.statLabel}>Este{'\n'}mes</Text>
          </View>
        </View>

        {/* Recientes */}
        {recientes.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Últimas atenciones</Text>
            {recientes.map((d) => (
              <View key={d.id_registro} style={styles.recentCard}>
                <View style={styles.recentIcon}>
                  <Ionicons name="medical" size={18} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentNombre} numberOfLines={1}>
                    {d.pacientes?.nombre_completo ?? 'Paciente'}
                  </Text>
                  <Text style={styles.recentVacuna} numberOfLines={1}>
                    {d.cat_vacunas_oficiales?.nombre_enfermedad} — {d.cat_vacunas_oficiales?.dosis_numero}
                  </Text>
                </View>
                <Text style={styles.recentFecha}>
                  {new Date(d.fecha_aplicacion).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
            ))}
          </>
        )}

        {recientes.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Sin atenciones hoy</Text>
            <Text style={styles.emptyDesc}>Selecciona una vacuna y escanea el QR para comenzar</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal catálogo */}
      <Modal visible={showCatalogo} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Catálogo PAI Bolivia</Text>
              <TouchableOpacity onPress={() => setShowCatalogo(false)}>
                <Ionicons name="close" size={24} color="#553b5e" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={catalogo}
              keyExtractor={(item) => item.id_vacuna}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.catalogoItem,
                    vacunaSeleccionada?.id_vacuna === item.id_vacuna && styles.catalogoItemActive,
                  ]}
                  onPress={() => { setVacunaSeleccionada(item); setShowCatalogo(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catalogoNombre}>{item.nombre_enfermedad}</Text>
                    <Text style={styles.catalogoDosis}>{item.dosis_numero} · {item.edad_meses_ideal} meses</Text>
                  </View>
                  {vacunaSeleccionada?.id_vacuna === item.id_vacuna && (
                    <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  scroll: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  headerName: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 2 },

  // Quick scan section
  quickSection: {
    backgroundColor: 'white', margin: 16, borderRadius: 20,
    padding: 18, borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  quickTitle: { fontSize: 16, fontWeight: 'bold', color: '#553b5e', marginBottom: 4 },
  quickSubtitle: { fontSize: 12, color: '#8e8e99', lineHeight: 16, marginBottom: 16 },
  vacunaPicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8F9FA', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
  },
  vacunaPickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  vacunaPickerIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  vacunaPickerPlaceholder: { color: '#8e8e99', fontSize: 13 },
  vacunaPickerSelected: { color: '#553b5e', fontSize: 14, fontWeight: '700' },
  vacunaPickerDosis: { color: '#8e8e99', fontSize: 11, marginTop: 1 },
  quickBtnsRow: { flexDirection: 'row', gap: 10 },
  quickScanBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 13,
  },
  quickScanBtnDisabled: { backgroundColor: '#D1D5DB' },
  quickScanBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  scanOnlyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 14, paddingVertical: 13,
  },
  scanOnlyBtnText: { color: PRIMARY, fontWeight: '700', fontSize: 13 },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#8e8e99',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginHorizontal: 20, marginTop: 8, marginBottom: 12,
  },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  statCard: {
    flex: 1, backgroundColor: 'white', borderRadius: 16,
    padding: 16, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  statNum: { fontSize: 24, fontWeight: 'bold', color: '#553b5e' },
  statLabel: { fontSize: 11, color: '#8e8e99', textAlign: 'center' },
  recentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB',
  },
  recentIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(162,129,186,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  recentNombre: { fontSize: 14, fontWeight: '700', color: '#553b5e' },
  recentVacuna: { fontSize: 12, color: '#8e8e99', marginTop: 2 },
  recentFecha: { fontSize: 12, color: '#8e8e99' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#553b5e', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#8e8e99', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#553b5e' },
  catalogoItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  catalogoItemActive: { backgroundColor: 'rgba(162,129,186,0.06)' },
  catalogoNombre: { fontSize: 14, fontWeight: '700', color: '#553b5e' },
  catalogoDosis: { fontSize: 12, color: '#8e8e99', marginTop: 2 },
});
