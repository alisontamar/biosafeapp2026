import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { pacientesVacunacionService } from '../../services/pacientesVacunacion.service';

export const PatientsListScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const pacientes = await pacientesVacunacionService.listarPacientesAtendidosPorUsuario();
      setPacientes(pacientes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const calcularEdad = (fechaNac: string) => {
    const meses =
      (new Date().getFullYear() - new Date(fechaNac).getFullYear()) * 12 +
      (new Date().getMonth() - new Date(fechaNac).getMonth());
    if (meses < 12) return `${meses}m`;
    return `${Math.floor(meses / 12)}a`;
  };

  const filtrados = pacientes.filter((p) =>
    p.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a281ba" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Mis Pacientes</Text>
        <Text style={styles.headerSub}>{pacientes.length} atendidos</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#8e8e99" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre..."
          placeholderTextColor="#8e8e99"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {filtrados.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={52} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>
            {pacientes.length === 0 ? 'Aún no has atendido pacientes' : 'Sin resultados'}
          </Text>
          <Text style={styles.emptyDesc}>
            {pacientes.length === 0 ? 'Escanea el QR de un paciente para comenzar' : 'Intenta con otro nombre'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(item) => item.id_paciente}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({ pathname: '/(healthTabs)/patient-detail', params: { id_paciente: item.id_paciente, grupo: 'health' } })
              }
            >
              <View style={styles.avatar}>
                <Ionicons name={item.sexo === 'F' ? 'woman' : 'man'} size={22} color="#a281ba" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>{item.nombre_completo}</Text>
                <Text style={styles.detalle}>{calcularEdad(item.fecha_nacimiento)}</Text>
              </View>
              <View style={styles.metaWrap}>
                <Text style={styles.metaFecha}>
                  {new Date(item.ultima_atencion).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  headerBar: {
    backgroundColor: '#553b5e',
    paddingHorizontal: 20, paddingVertical: 18,
  },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'white', margin: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, height: 48,
  },
  searchInput: { flex: 1, color: '#553b5e', fontSize: 15 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', borderRadius: 14,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(162,129,186,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  nombre: { fontSize: 15, fontWeight: '700', color: '#553b5e' },
  detalle: { fontSize: 12, color: '#8e8e99', marginTop: 2 },
  metaWrap: { alignItems: 'flex-end', gap: 4 },
  metaFecha: { fontSize: 12, color: '#8e8e99' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#553b5e', marginTop: 14, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: '#8e8e99', marginTop: 6, textAlign: 'center' },
});
