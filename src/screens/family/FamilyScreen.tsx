import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';
import { pacientesVacunacionService } from '../../services/pacientesVacunacion.service';

export const FamilyScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hijos, setHijos] = useState<any[]>([]);

  const cargarHijos = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const pacientes = await pacientesVacunacionService.listarHijosDeTutor();

      setHijos(pacientes || []);
    } catch (error) {
      console.error('Error cargando hijos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarHijos();
  }, [cargarHijos]);

  const calcularEdad = (fechaNac: string) => {
    const hoy = new Date();
    const nac = new Date(fechaNac);
    const meses = (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth());
    if (meses < 12) return `${meses} meses`;
    const años = Math.floor(meses / 12);
    const restoMeses = meses % 12;
    return restoMeses > 0 ? `${años} años ${restoMeses} meses` : `${años} años`;
  };

  const renderChildCard = ({ item }: any) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/(tabs)/family/[id]', params: { id: item.id_paciente } })}
    >
      <Card style={styles.childCard}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Ionicons name="happy-outline" size={32} color={colors.primary} />
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.childName}>{item.nombre_completo}</Text>
            <Text style={styles.childAge}>{calcularEdad(item.fecha_nacimiento)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.tertiary} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Familia</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : hijos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={64} color={colors.tertiary} />
          <Text style={styles.emptyTitle}>Aún no tienes familiares</Text>
          <Text style={styles.emptySubtext}>Añade familiares desde la pantalla de inicio</Text>
        </View>
      ) : (
        <FlatList
          data={hijos}
          renderItem={renderChildCard}
          keyExtractor={item => item.id_paciente}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.secondary },
  listContainer: { paddingHorizontal: 24, paddingBottom: 100 },
  childCard: { marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoContainer: { flex: 1 },
  childName: { fontSize: 18, fontWeight: 'bold', color: colors.secondary, marginBottom: 4 },
  childAge: { fontSize: 14, color: colors.tertiary },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.secondary, marginTop: 16, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: colors.tertiary, marginTop: 8, textAlign: 'center', marginBottom: 24 },
});
