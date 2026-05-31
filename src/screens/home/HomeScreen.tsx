// src/screens/home/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// Asumiendo que tienes un Header y Card. Si no los tienes creados, puedes usar Views normales.
import { Header } from '../../components/Header'; 
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';
import { supabase } from '../../lib/supabase';

export const HomeScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  
  // Estado para datos del Tutor
  const [proximaVacuna, setProximaVacuna] = useState<any>(null);
  const [hijos, setHijos] = useState<any[]>([]);

  useEffect(() => {
    cargarDatosHome();
  }, []);

  const cargarDatosHome = async () => {
    try {
      setLoading(true);
      
      // 1. Obtener el usuario actual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      // 2. Traer el perfil y rol
      const { data: profile, error: profileError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id_usuario', session.user.id)
        .single();

      if (profileError) throw profileError;
      setUserData(profile);

      // 3. Lógica según el Rol
      if (profile.rol === 'Tutor_PersonaNormal') {
        // Buscar a los pacientes a su cargo
        const { data: pacientes } = await supabase
          .from('pacientes')
          .select('id_paciente, nombre_completo')
          .eq('id_tutor_registro', profile.id_usuario);
        
        setHijos(pacientes || []);

        if (pacientes && pacientes.length > 0) {
          const idsPacientes = pacientes.map(p => p.id_paciente);
          
          // Buscar si hay dosis pendientes (MVP: Simulamos trayendo la más cercana)
          const { data: dosis } = await supabase
            .from('dosis_aplicadas')
            .select(`
              fecha_vencimiento_proxima,
              cat_vacunas_oficiales ( nombre_enfermedad ),
              pacientes ( nombre_completo )
            `)
            .in('id_paciente', idsPacientes)
            .not('fecha_vencimiento_proxima', 'is', null)
            .gte('fecha_vencimiento_proxima', new Date().toISOString())
            .order('fecha_vencimiento_proxima', { ascending: true })
            .limit(1)
            .single();

          if (dosis) setProximaVacuna(dosis);
        }
      }

    } catch (error) {
      console.error('Error al cargar Home:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularDiasFaltantes = (fechaVencimiento: string) => {
    const hoy = new Date();
    const fecha = new Date(fechaVencimiento);
    const diffTime = fecha.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // =========================================================
  // VISTA 1: TUTOR / PADRE DE FAMILIA
  // =========================================================
  const renderTutorView = () => (
    <>
      <Text style={styles.sectionTitle}>Prioridad</Text>
      
      {proximaVacuna ? (
        <Card style={styles.widgetCard}>
          <View style={styles.widgetHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="medical" size={24} color={colors.background} />
            </View>
            <View style={styles.widgetBadge}>
              <Text style={styles.badgeText}>
                Faltan {calcularDiasFaltantes(proximaVacuna.fecha_vencimiento_proxima)} días
              </Text>
            </View>
          </View>
          
          <Text style={styles.vaccineName}>
            {proximaVacuna.cat_vacunas_oficiales?.nombre_enfermedad || 'Refuerzo programado'}
          </Text>
          <Text style={styles.childName}>Para: {proximaVacuna.pacientes?.nombre_completo}</Text>
          
          <TouchableOpacity style={styles.widgetButton}>
            <Text style={styles.widgetButtonText}>Ver Carnet QR</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        <Card style={[styles.widgetCard, { backgroundColor: '#10b981', borderColor: '#10b981' }]}>
          <View style={styles.widgetHeader}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <Ionicons name="checkmark-circle" size={24} color={colors.background} />
            </View>
          </View>
          <Text style={styles.vaccineName}>¡Todo al día!</Text>
          <Text style={styles.childName}>No hay vacunas próximas programadas.</Text>
          <TouchableOpacity style={styles.widgetButton}>
            <Text style={[styles.widgetButtonText, { color: '#10b981' }]}>Revisar Historial</Text>
          </TouchableOpacity>
        </Card>
      )}

      <Text style={styles.sectionTitle}>Recomendaciones para ti</Text>
      
      <Card style={styles.tipCard}>
        <Ionicons name="water-outline" size={32} color={colors.primary} />
        <View style={styles.tipTextContainer}>
          <Text style={styles.tipTitle}>Hidratación post-vacuna</Text>
          <Text style={styles.tipDescription}>Es normal presentar fiebre leve tras algunas vacunas. Mantén buena hidratación.</Text>
        </View>
      </Card>

      <Card style={styles.tipCard}>
        <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} />
        <View style={styles.tipTextContainer}>
          <Text style={styles.tipTitle}>Protección familiar</Text>
          <Text style={styles.tipDescription}>Recuerda que la vacunación no solo protege a tus hijos, sino a toda tu comunidad.</Text>
        </View>
      </Card>
    </>
  );

  // =========================================================
  // VISTA 2: PERSONAL MÉDICO / CENTRO DE SALUD
  // =========================================================
  const renderHealthCenterView = () => (
    <>
      <Text style={styles.sectionTitle}>Acceso Rápido</Text>
      
      {/* Botón Principal de Escaneo (Lo más usado por un médico en celular) */}
      <TouchableOpacity 
        style={styles.scanButton}
        onPress={() => { /* Navegar a pantalla de escaner de cámara */ }}
      >
        <View style={styles.scanIconBg}>
          <Ionicons name="qr-code-outline" size={40} color={colors.background} />
        </View>
        <Text style={styles.scanTitle}>Escanear Carnet QR</Text>
        <Text style={styles.scanDesc}>Identificar paciente y registrar dosis</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Resumen del Día</Text>
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Ionicons name="people-outline" size={24} color={colors.primary} />
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Atendidos</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="color-fill-outline" size={24} color={'#10b981'} />
          <Text style={styles.statValue}>18</Text>
          <Text style={styles.statLabel}>Dosis aplicadas</Text>
        </View>
      </View>

      <Card style={styles.tipCard}>
        <Ionicons name="warning-outline" size={32} color={'#ef4444'} />
        <View style={styles.tipTextContainer}>
          <Text style={[styles.tipTitle, { color: '#ef4444' }]}>Alerta de Stock IA</Text>
          <Text style={styles.tipDescription}>Quedan menos de 10 dosis de Neumococo en el inventario local.</Text>
        </View>
      </Card>
    </>
  );

  // =========================================================
  // RENDER PRINCIPAL
  // =========================================================
  if (loading) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isTutor = userData?.rol === 'Tutor_PersonaNormal';
  // Obtenemos solo el primer nombre para el saludo
  const nombreCorto = userData?.nombre_completo?.split(' ')[0] || 'Usuario';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header userName={nombreCorto} />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {isTutor ? renderTutorView() : renderHealthCenterView()}

        {/* Espacio extra al final para scroll cómodo */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.secondary, marginTop: 24, marginBottom: 16 },
  
  // Widget Tutor
  widgetCard: { backgroundColor: colors.primary, borderColor: colors.primary },
  widgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconContainer: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 },
  widgetBadge: { backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: colors.primary, fontWeight: 'bold', fontSize: 12 },
  vaccineName: { fontSize: 20, fontWeight: 'bold', color: colors.background, marginBottom: 4 },
  childName: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  widgetButton: { backgroundColor: colors.background, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  widgetButtonText: { color: colors.secondary, fontWeight: 'bold', fontSize: 14 },

  // Tips Generales
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, backgroundColor: colors.background },
  tipTextContainer: { flex: 1, marginLeft: 16 },
  tipTitle: { fontSize: 16, fontWeight: 'bold', color: colors.secondary, marginBottom: 4 },
  tipDescription: { fontSize: 14, color: colors.tertiary, lineHeight: 20 },

  // Estilos Health Center
  scanButton: { backgroundColor: colors.secondary, padding: 24, borderRadius: 20, alignItems: 'center', shadowColor: colors.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  scanIconBg: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 16, borderRadius: 20, marginBottom: 12 },
  scanTitle: { color: colors.background, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  scanDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: colors.background, padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: colors.secondary, marginTop: 8 },
  statLabel: { fontSize: 12, color: colors.tertiary, marginTop: 4 },
});