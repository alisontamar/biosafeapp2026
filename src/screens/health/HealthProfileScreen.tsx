import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { usuariosService } from '../../services/usuarios.service';
import { establecimientosService } from '../../services/establecimientos.service';
import { LABEL_ROL, RolUsuario } from '../../types';

export const HealthProfileScreen = () => {
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

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#a281ba" /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="white" />
          </View>
          <Text style={styles.nombre}>{userData?.nombre_completo}</Text>
          <View style={styles.rolBadge}>
            <Text style={styles.rolText}>{LABEL_ROL[userData?.rol as RolUsuario] ?? userData?.rol}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color="#8e8e99" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Correo electrónico</Text>
              <Text style={styles.infoValue}>{userData?.correo_electronico}</Text>
            </View>
          </View>
          {establecimiento && (
            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={18} color="#8e8e99" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Establecimiento</Text>
                <Text style={styles.infoValue}>{establecimiento.nombre_establecimiento}</Text>
                <Text style={styles.infoSub}>{establecimiento.ciudad_municipio} · {establecimiento.tipo}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Cerrar sesión */}
        <TouchableOpacity style={styles.logoutBtn} onPress={cerrarSesion}>
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
  headerBar: { backgroundColor: '#553b5e', paddingHorizontal: 20, paddingVertical: 18 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  avatarSection: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#a281ba', justifyContent: 'center', alignItems: 'center',
  },
  nombre: { fontSize: 20, fontWeight: 'bold', color: '#553b5e' },
  rolBadge: {
    backgroundColor: 'rgba(26,115,232,0.1)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
  },
  rolText: { color: '#a281ba', fontWeight: '600', fontSize: 13 },
  section: {
    backgroundColor: 'white', marginHorizontal: 16, borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  infoLabel: { fontSize: 11, color: '#8e8e99', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#553b5e', marginTop: 2 },
  infoSub: { fontSize: 12, color: '#8e8e99', marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', marginHorizontal: 16, marginTop: 20,
    borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#FEE2E2',
  },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 16 },
});
