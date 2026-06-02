import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export const QRScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paciente, setPaciente] = useState<any>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const { data: pacientes } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id_tutor_registro', session.user.id)
        .order('fecha_registro', { ascending: true })
        .limit(1);

      if (pacientes && pacientes.length > 0) {
        setPaciente(pacientes[0]);
      }
    } catch (error) {
      console.error('Error cargando QR:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!paciente) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.tertiary} />
          <Text style={styles.noDataText}>No se encontró tu carnet digital</Text>
          <Text style={styles.noDataSubtext}>Completa tu registro para generar el QR</Text>
        </View>
      </SafeAreaView>
    );
  }

  const qrValue = JSON.stringify({
    id_paciente: paciente.id_paciente,
    token: paciente.codigo_qr_token,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Código de Identidad</Text>
        <Text style={styles.subtitle}>Muestra este código al personal médico para acceder al expediente rápidamente.</Text>

        <View style={styles.qrContainer}>
          <QRCode
            value={qrValue}
            size={220}
            backgroundColor="white"
            color={colors.secondary}
          />
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{paciente.nombre_completo}</Text>
          <Text style={styles.userId}>ID: {paciente.id_paciente.slice(0, 8)}...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.secondary, marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.tertiary, textAlign: 'center', marginBottom: 48, lineHeight: 24 },
  qrContainer: { padding: 24, backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: colors.secondary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, marginBottom: 40 },
  userInfo: { alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  userName: { fontSize: 20, fontWeight: 'bold', color: colors.secondary, marginBottom: 4 },
  userId: { fontSize: 16, color: colors.tertiary },
  noDataText: { fontSize: 18, fontWeight: 'bold', color: colors.secondary, marginTop: 16, textAlign: 'center' },
  noDataSubtext: { fontSize: 14, color: colors.tertiary, marginTop: 8, textAlign: 'center' },
});
