import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';

type Alerta = {
  id: string;
  titulo: string;
  resumen: string;
  nivel: 'info' | 'warning' | 'critical';
  fuente_url: string | null;
  fecha_generacion: string;
};

const NIVEL_CONFIG = {
  info: { color: '#a281ba', bg: 'rgba(162,129,186,0.08)', icon: 'information-circle-outline' as const, label: 'Informativo' },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', icon: 'warning-outline' as const, label: 'Precaución' },
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', icon: 'alert-circle-outline' as const, label: 'Urgente' },
};

export const AlertsScreen = () => {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alertas_epidemiologicas_ia')
        .select('id, titulo, resumen, nivel, fuente_url, fecha_generacion')
        .eq('activa', true)
        .order('fecha_generacion', { ascending: false });

      if (!error && data) setAlertas(data as Alerta[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const formatFecha = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderAlerta = ({ item }: { item: Alerta }) => {
    const cfg = NIVEL_CONFIG[item.nivel] ?? NIVEL_CONFIG.info;
    return (
      <View style={[styles.card, { backgroundColor: cfg.bg, borderLeftColor: cfg.color }]}>
        <View style={styles.cardHeader}>
          <View style={styles.nivelBadge}>
            <Ionicons name={cfg.icon} size={14} color={cfg.color} />
            <Text style={[styles.nivelLabel, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={styles.fecha}>{formatFecha(item.fecha_generacion)}</Text>
        </View>

        <Text style={styles.titulo}>{item.titulo}</Text>
        <Text style={styles.resumen}>{item.resumen}</Text>

        {item.fuente_url ? (
          <TouchableOpacity
            style={styles.fuenteRow}
            onPress={() => item.fuente_url && Linking.openURL(item.fuente_url)}
          >
            <Ionicons name="open-outline" size={13} color="#8e8e99" />
            <Text style={styles.fuenteText} numberOfLines={1}>
              Ver fuente oficial
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Alertas</Text>
        <Text style={styles.subtitle}>Epidemiológicas · Actualización diaria con IA</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#a281ba" />
          <Text style={styles.loadingText}>Cargando alertas...</Text>
        </View>
      ) : alertas.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="shield-checkmark-outline" size={60} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Sin alertas activas</Text>
          <Text style={styles.emptyDesc}>No hay alertas epidemiológicas vigentes en este momento.</Text>
        </View>
      ) : (
        <FlatList
          data={alertas}
          keyExtractor={(item) => item.id}
          renderItem={renderAlerta}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.iaNote}>
              <Ionicons name="globe-outline" size={14} color="#a281ba" />
              <Text style={styles.iaNoteText}>
                Generadas por IA a partir de fuentes oficiales (OPS, OMS, Ministerio de Salud Bolivia)
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    backgroundColor: '#553b5e',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18,
  },
  title: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 3 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 10 },
  loadingText: { color: '#8e8e99', fontSize: 14 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#553b5e', textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: '#8e8e99', textAlign: 'center' },
  iaNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(162,129,186,0.08)', borderRadius: 10,
    padding: 10, marginBottom: 14,
  },
  iaNoteText: { flex: 1, fontSize: 11, color: '#553b5e', lineHeight: 16 },
  card: {
    borderRadius: 14, padding: 16, marginBottom: 12,
    borderLeftWidth: 4,
    backgroundColor: 'white',
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nivelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nivelLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  fecha: { fontSize: 11, color: '#8e8e99' },
  titulo: { fontSize: 15, fontWeight: '700', color: '#553b5e', marginBottom: 6 },
  resumen: { fontSize: 13, color: '#444', lineHeight: 20, marginBottom: 10 },
  fuenteRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fuenteText: { fontSize: 12, color: '#8e8e99', textDecorationLine: 'underline', flex: 1 },
});
