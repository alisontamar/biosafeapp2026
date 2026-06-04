import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LABEL_ROL, RolUsuario } from '../../types';

const ROL_COLOR: Partial<Record<RolUsuario, string>> = {
  SuperAdmin: '#a281ba',
  AdminEstablecimiento: '#8f6faa',
  Medico: '#a281ba',
  Enfermero: '#0D9488',
  Farmaceutico: '#D97706',
  Tutor_PersonaNormal: '#10B981',
};

export const UserManagementScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [miRol, setMiRol] = useState<string>('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: perfil } = await supabase
        .from('usuarios')
        .select('rol, id_establecimiento')
        .eq('id_usuario', session.user.id)
        .single();
      if (!perfil) return;
      setMiRol(perfil.rol);

      let query = supabase
        .from('usuarios')
        .select('id_usuario, nombre_completo, correo_electronico, rol, fecha_registro, establecimientos(nombre_establecimiento)')
        .order('fecha_registro', { ascending: false });

      if (perfil.rol === 'AdminEstablecimiento' && perfil.id_establecimiento) {
        query = query.eq('id_establecimiento', perfil.id_establecimiento);
      }

      const { data } = await query;
      setUsuarios(data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = usuarios.filter(
    (u) =>
      u.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.correo_electronico.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#a281ba" /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Usuarios</Text>
          <Text style={styles.headerSub}>{usuarios.length} registrados</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(adminTabs)/create-user')}
        >
          <Ionicons name="person-add" size={18} color="white" />
          <Text style={styles.addBtnText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#8e8e99" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o correo..."
          placeholderTextColor="#8e8e99"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      <FlatList
        data={filtrados}
        keyExtractor={(item) => item.id_usuario}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Sin usuarios</Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = ROL_COLOR[item.rol as RolUsuario] ?? '#8e8e99';
          return (
            <View style={styles.card}>
              <View style={[styles.avatar, { backgroundColor: `${color}18` }]}>
                <Ionicons name="person" size={20} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>{item.nombre_completo}</Text>
                <Text style={styles.email} numberOfLines={1}>{item.correo_electronico}</Text>
                {item.establecimientos && (
                  <Text style={styles.est} numberOfLines={1}>{item.establecimientos.nombre_establecimiento}</Text>
                )}
              </View>
              <View style={[styles.rolBadge, { backgroundColor: `${color}18` }]}>
                <Text style={[styles.rolText, { color }]}>
                  {LABEL_ROL[item.rol as RolUsuario] ?? item.rol}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  headerBar: {
    backgroundColor: '#553b5e',
    paddingHorizontal: 20, paddingVertical: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#a281ba', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'white', margin: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, height: 48,
  },
  searchInput: { flex: 1, color: '#553b5e', fontSize: 15 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center',
  },
  nombre: { fontSize: 14, fontWeight: '700', color: '#553b5e' },
  email: { fontSize: 12, color: '#8e8e99', marginTop: 2 },
  est: { fontSize: 11, color: '#8e8e99', marginTop: 1 },
  rolBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  rolText: { fontSize: 11, fontWeight: '700' },
  emptyTitle: { fontSize: 15, color: '#8e8e99', marginTop: 12, textAlign: 'center' },
});
