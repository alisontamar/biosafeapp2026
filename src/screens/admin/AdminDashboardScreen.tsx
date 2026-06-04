import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator,
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
          const [resPersonal, resDosis] = await Promise.all([
            supabase.from('usuarios').select('id_usuario', { count: 'exact', head: true }).eq('id_establecimiento', estId),
            supabase.from('dosis_aplicadas').select('id_registro', { count: 'exact', head: true }),
          ]);
          setStats({ establecimientos: 1, usuarios: resPersonal.count ?? 0, pacientes: 0, dosis: resDosis.count ?? 0 });
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
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={() => router.push('/(adminTabs)/scanner')}
            >
              <View style={styles.scanIconBg}>
                <Ionicons name="qr-code-outline" size={38} color="white" />
              </View>
              <Text style={styles.scanTitle}>Escanear Carnet QR</Text>
              <Text style={styles.scanDesc}>Identificar paciente y registrar vacuna</Text>
            </TouchableOpacity>
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
  scanBtn: {
    backgroundColor: '#2d1f3d', borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(162,129,186,0.3)',
  },
  scanIconBg: {
    backgroundColor: 'rgba(162,129,186,0.25)', padding: 18, borderRadius: 24, marginBottom: 12,
  },
  scanTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  scanDesc: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
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
});
