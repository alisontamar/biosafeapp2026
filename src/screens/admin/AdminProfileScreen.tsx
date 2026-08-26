import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { usuariosService } from '../../services/usuarios.service';
import { establecimientosService } from '../../services/establecimientos.service';
import { LABEL_ROL, RolUsuario } from '../../types';

export const AdminProfileScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [establecimiento, setEstablecimiento] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const perfil = await usuariosService.obtenerPerfil();
      if (perfil) {
        setUserData(perfil);
        if (perfil.id_establecimiento) {
          const est = await establecimientosService.obtenerPorId({ id_establecimiento: perfil.id_establecimiento });
          if (est) setEstablecimiento(est);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#a281ba" /></View>;
  }

  const isSuperAdmin = userData?.rol === 'SuperAdmin';

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={['#8f6faa', '#a281ba']} style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="shield-checkmark" size={36} color="white" />
        </View>
        <Text style={styles.nombre}>{userData?.nombre_completo}</Text>
        <View style={styles.rolBadge}>
          <Text style={styles.rolText}>{LABEL_ROL[userData?.rol as RolUsuario] ?? userData?.rol}</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.row}>
            <Ionicons name="mail-outline" size={18} color="#8e8e99" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Correo electrónico</Text>
              <Text style={styles.rowValue}>{userData?.correo_electronico}</Text>
            </View>
          </View>
          {!isSuperAdmin && establecimiento && (
            <View style={styles.row}>
              <Ionicons name="business-outline" size={18} color="#8e8e99" />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Establecimiento</Text>
                <Text style={styles.rowValue}>{establecimiento.nombre_establecimiento}</Text>
                <Text style={styles.rowSub}>{establecimiento.ciudad_municipio} · {establecimiento.tipo}</Text>
              </View>
            </View>
          )}
          {isSuperAdmin && (
            <View style={styles.row}>
              <Ionicons name="globe-outline" size={18} color="#8e8e99" />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>Acceso</Text>
                <Text style={styles.rowValue}>Sistema completo</Text>
                <Text style={styles.rowSub}>Acceso total a establecimientos, usuarios y pacientes</Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => { await supabase.auth.signOut(); router.replace('/login'); }}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingVertical: 36, alignItems: 'center', gap: 10 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  nombre: { color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 20 },
  rolBadge: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20 },
  rolText: { color: 'white', fontWeight: '700', fontSize: 13 },
  section: {
    backgroundColor: 'white', margin: 16, borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  rowLabel: { fontSize: 11, color: '#8e8e99', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue: { fontSize: 15, fontWeight: '600', color: '#553b5e', marginTop: 2 },
  rowSub: { fontSize: 12, color: '#8e8e99', marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', marginHorizontal: 16, marginTop: 8,
    borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#FEE2E2',
  },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 16 },
});
