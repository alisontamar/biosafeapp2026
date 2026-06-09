import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LABEL_ROL, RolUsuario } from '../../types';

const PRIMARY = '#a281ba';
const PRIMARY_DARK = '#8f6faa';

export const AdminDashboardScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState({ establecimientos: 0, usuarios: 0, pacientes: 0, dosis: 0 });
  const [establecimiento, setEstablecimiento] = useState<any>(null);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [vacunaSeleccionada, setVacunaSeleccionada] = useState<any>(null);
  const [showCatalogo, setShowCatalogo] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const { data: perfil } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id_usuario', session.user.id)
        .single();
      if (!perfil) return;
      setUserData(perfil);

      if (perfil.rol === 'SuperAdmin') {
        const [resEst, resUsers, resPac, resDosis] = await Promise.all([
          supabase.from('establecimientos').select('id_establecimiento', { count: 'exact', head: true }),
          supabase.from('usuarios').select('id_usuario', { count: 'exact', head: true }),
          supabase.from('pacientes').select('id_paciente', { count: 'exact', head: true }),
          supabase.from('dosis_aplicadas').select('id_registro', { count: 'exact', head: true }),
        ]);
        setStats({
          establecimientos: resEst.count ?? 0,
          usuarios: resUsers.count ?? 0,
          pacientes: resPac.count ?? 0,
          dosis: resDosis.count ?? 0,
        });
      } else {
        const estId = perfil.id_establecimiento;
        if (estId) {
          const { data: est } = await supabase
            .from('establecimientos')
            .select('*')
            .eq('id_establecimiento', estId)
            .single();
          setEstablecimiento(est);
          const [resPersonal, resDosis, resCat] = await Promise.all([
            supabase.from('usuarios').select('id_usuario', { count: 'exact', head: true }).eq('id_establecimiento', estId),
            supabase.from('dosis_aplicadas').select('id_registro', { count: 'exact', head: true }),
            supabase.from('cat_vacunas_oficiales').select('*').order('edad_meses_ideal', { ascending: true }),
          ]);
          setStats({ establecimientos: 1, usuarios: resPersonal.count ?? 0, pacientes: 0, dosis: resDosis.count ?? 0 });
          setCatalogo(resCat.data ?? []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;
  }

  const isSuperAdmin = userData?.rol === 'SuperAdmin';
  const nombre = userData?.nombre_completo?.split(' ')[0] ?? 'Admin';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#553b5e', '#2d1f3d']} style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSub}>
              {isSuperAdmin ? 'Super Administrador' : 'Admin. Establecimiento'}
            </Text>
            <Text style={styles.headerName}>Hola, {nombre}</Text>
            {!isSuperAdmin && establecimiento && (
              <Text style={styles.headerEst}>{establecimiento.nombre_establecimiento}</Text>
            )}
          </View>
          <TouchableOpacity onPress={async () => { await supabase.auth.signOut(); router.replace('/login'); }}>
            <Ionicons name="log-out-outline" size={24} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Scanner QR — visible para AdminEstablecimiento */}
        {!isSuperAdmin && (
          <View style={styles.scanWrap}>
            <View style={styles.scanCard}>
              <Text style={styles.scanTitle}>Escanear Carnet QR</Text>
              <Text style={styles.scanDesc}>
                Selecciona una vacuna para registrarla al escanear, o escanea directamente para ver el historial
              </Text>

              {/* Selector de vacuna */}
              <TouchableOpacity style={styles.vacunaPicker} onPress={() => setShowCatalogo(true)}>
                <View style={styles.vacunaPickerLeft}>
                  <View style={[styles.vacunaPickerIcon, vacunaSeleccionada && { backgroundColor: PRIMARY }]}>
                    <Ionicons name="medical" size={18} color={vacunaSeleccionada ? 'white' : '#8e8e99'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    {vacunaSeleccionada ? (
                      <>
                        <Text style={styles.vacunaPickerSelected}>{vacunaSeleccionada.nombre_enfermedad}</Text>
                        <Text style={styles.vacunaPickerDosis}>{vacunaSeleccionada.dosis_numero}</Text>
                      </>
                    ) : (
                      <Text style={styles.vacunaPickerPlaceholder}>Seleccionar vacuna (opcional)</Text>
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
                      pathname: '/(adminTabs)/quick-scan',
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
                  onPress={() => router.push({ pathname: '/(adminTabs)/scanner', params: { grupo: 'admin' } })}
                >
                  <Ionicons name="scan-outline" size={16} color={PRIMARY} />
                  <Text style={styles.scanOnlyBtnText}>Ver historial</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Acciones rápidas */}
        <Text style={styles.sectionLabel}>Acciones rápidas</Text>
        <View style={styles.actionsRow}>
          {isSuperAdmin && (
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: 'rgba(162,129,186,0.12)' }]}
              onPress={() => router.push('/(adminTabs)/create-establishment')}
            >
              <View style={[styles.actionIcon, { backgroundColor: PRIMARY }]}>
                <Ionicons name="add-circle" size={22} color="white" />
              </View>
              <Text style={styles.actionText}>Nuevo{'\n'}Centro</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: 'rgba(162,129,186,0.12)' }]}
            onPress={() => router.push('/(adminTabs)/create-user')}
          >
            <View style={[styles.actionIcon, { backgroundColor: PRIMARY }]}>
              <Ionicons name="person-add" size={22} color="white" />
            </View>
            <Text style={styles.actionText}>Nuevo{'\n'}Usuario</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#D1FAE5' }]}
            onPress={() => router.push('/(adminTabs)/usuarios')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#10B981' }]}>
              <Ionicons name="people" size={22} color="white" />
            </View>
            <Text style={styles.actionText}>Ver{'\n'}Usuarios</Text>
          </TouchableOpacity>
          {isSuperAdmin && (
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: 'rgba(162,129,186,0.08)' }]}
              onPress={() => router.push('/(adminTabs)/establecimientos')}
            >
              <View style={[styles.actionIcon, { backgroundColor: PRIMARY_DARK }]}>
                <Ionicons name="business" size={22} color="white" />
              </View>
              <Text style={styles.actionText}>Ver{'\n'}Centros</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <Text style={styles.sectionLabel}>Estadísticas generales</Text>
        <View style={styles.statsGrid}>
          {isSuperAdmin && (
            <TouchableOpacity style={styles.statCard} onPress={() => router.push('/(adminTabs)/establecimientos')}>
              <Ionicons name="business" size={24} color={PRIMARY} />
              <Text style={styles.statNum}>{stats.establecimientos}</Text>
              <Text style={styles.statLabel}>Centros de{'\n'}salud</Text>
            </TouchableOpacity>
          )}
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color={PRIMARY} />
            <Text style={styles.statNum}>{stats.usuarios}</Text>
            <Text style={styles.statLabel}>
              {isSuperAdmin ? 'Usuarios\nregistrados' : 'Personal\nasignado'}
            </Text>
          </View>
          {isSuperAdmin && (
            <View style={styles.statCard}>
              <Ionicons name="person" size={24} color="#10B981" />
              <Text style={styles.statNum}>{stats.pacientes}</Text>
              <Text style={styles.statLabel}>Pacientes en{'\n'}el sistema</Text>
            </View>
          )}
          <View style={styles.statCard}>
            <Ionicons name="color-fill" size={24} color="#F59E0B" />
            <Text style={styles.statNum}>{stats.dosis}</Text>
            <Text style={styles.statLabel}>Dosis{'\n'}aplicadas</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal catálogo de vacunas */}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  headerName: { color: 'white', fontSize: 26, fontWeight: 'bold', marginTop: 2 },
  headerEst: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },
  scanWrap: { padding: 16, paddingBottom: 0 },
  scanCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  scanTitle: { fontSize: 16, fontWeight: 'bold', color: '#553b5e', marginBottom: 4 },
  scanDesc: { fontSize: 12, color: '#8e8e99', lineHeight: 16, marginBottom: 16 },
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
  quickScanBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  scanOnlyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 14, paddingVertical: 13,
  },
  scanOnlyBtnText: { color: PRIMARY, fontWeight: '700', fontSize: 13 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#8e8e99',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginHorizontal: 20, marginTop: 24, marginBottom: 12,
  },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, flexWrap: 'wrap' },
  actionCard: {
    flex: 1, minWidth: 70, borderRadius: 16, padding: 14, alignItems: 'center', gap: 8,
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  actionText: { fontSize: 12, fontWeight: '700', color: '#553b5e', textAlign: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  statCard: {
    width: '47%', backgroundColor: 'white', borderRadius: 16,
    padding: 18, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  statNum: { fontSize: 28, fontWeight: 'bold', color: '#553b5e' },
  statLabel: { fontSize: 12, color: '#8e8e99', textAlign: 'center' },
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
