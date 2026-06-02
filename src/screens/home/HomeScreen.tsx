import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { QRModal } from '../../components/QRModal';

export const HomeScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [proximaVacuna, setProximaVacuna] = useState<any>(null);
  const [hijos, setHijos] = useState<any[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newGender, setNewGender] = useState<'M' | 'F'>('M');
  const [qrPaciente, setQrPaciente] = useState<any>(null);

  useEffect(() => {
    cargarDatosHome();
  }, []);

  const cargarDatosHome = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const { data: profile } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id_usuario', session.user.id)
        .single();

      if (!profile) return;
      setUserData(profile);

      if (profile.rol === 'Tutor_PersonaNormal') {
        const { data: pacientes } = await supabase
          .from('pacientes')
          .select('id_paciente, nombre_completo, fecha_nacimiento, sexo, codigo_qr_token')
          .eq('id_tutor_registro', profile.id_usuario)
          .order('fecha_registro', { ascending: true });

        setHijos(pacientes || []);

        if (pacientes && pacientes.length > 0) {
          const idsPacientes = pacientes.map(p => p.id_paciente);
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

  const calcularEdad = (fechaNac: string) => {
    const hoy = new Date();
    const nac = new Date(fechaNac);
    const meses = (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth());
    if (meses < 12) return `${meses} meses`;
    const años = Math.floor(meses / 12);
    return `${años} años`;
  };

  const handleAddChild = async () => {
    if (!newName.trim() || !newBirthDate.trim()) {
      Alert.alert('Error', 'Completa todos los campos requeridos.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newBirthDate)) {
      Alert.alert('Error', 'Formato de fecha: AAAA-MM-DD');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const tokenUnico = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `biosafe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { error } = await supabase.from('pacientes').insert([{
        id_tutor_registro: session.user.id,
        nombre_completo: newName.trim(),
        fecha_nacimiento: newBirthDate.trim(),
        sexo: newGender,
        es_embarazada: false,
        codigo_qr_token: tokenUnico,
      }]);

      if (error) throw error;

      await supabase.from('usuarios').update({ tiene_hijos: true }).eq('id_usuario', session.user.id);

      Alert.alert('Éxito', `${newName.trim()} ha sido añadido a tu familia.`);
      setShowAddModal(false);
      setNewName('');
      setNewBirthDate('');
      setNewGender('M');
      cargarDatosHome();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo añadir.');
    } finally {
      setSaving(false);
    }
  };

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
          <TouchableOpacity style={styles.widgetButton} onPress={() => router.push('/(tabs)/qr')}>
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
          <TouchableOpacity style={styles.widgetButton} onPress={() => router.push('/(tabs)/family')}>
            <Text style={[styles.widgetButtonText, { color: '#10b981' }]}>Revisar Historial</Text>
          </TouchableOpacity>
        </Card>
      )}

      <View style={styles.familyHeader}>
        <Text style={styles.sectionTitle}>Mis Familiares</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={20} color={colors.background} />
          <Text style={styles.addButtonText}>Añadir</Text>
        </TouchableOpacity>
      </View>

      {hijos.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="people-outline" size={40} color={colors.tertiary} />
          <Text style={styles.emptyTitle}>Aún no tienes familiares</Text>
          <Text style={styles.emptySubtext}>Añade a tus hijos para gestionar sus vacunas</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)}>
            <Text style={styles.emptyButtonText}>Añadir familiar</Text>
          </TouchableOpacity>
        </Card>
      ) : (
        hijos.map(hijo => (
          <TouchableOpacity key={hijo.id_paciente} activeOpacity={0.7} onPress={() => router.push({ pathname: '/(tabs)/family/[id]', params: { id: hijo.id_paciente } })}>
            <Card style={styles.childCard}>
              <View style={styles.childRow}>
                <View style={styles.avatar}>
                  <Ionicons name="happy-outline" size={28} color={colors.primary} />
                </View>
                <View style={styles.childInfo}>
                  <Text style={styles.childNameText}>{hijo.nombre_completo}</Text>
                  <Text style={styles.childAgeText}>{calcularEdad(hijo.fecha_nacimiento)}</Text>
                </View>
                <View style={styles.childActions}>
                  <TouchableOpacity style={styles.actionIcon} onPress={() => setQrPaciente(hijo)}>
                    <Ionicons name="qr-code-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={20} color={colors.tertiary} />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))
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

  const renderHealthCenterView = () => (
    <>
      <Text style={styles.sectionTitle}>Acceso Rápido</Text>

      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => router.push('/(tabs)/qr')}
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

  if (loading) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isTutor = userData?.rol === 'Tutor_PersonaNormal';
  const nombreCorto = userData?.nombre_completo?.split(' ')[0] || 'Usuario';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header userName={nombreCorto} />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {isTutor ? renderTutorView() : renderHealthCenterView()}
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Añadir familiar</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} disabled={saving}>
                <Ionicons name="close" size={24} color={colors.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={colors.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor={colors.tertiary}
                value={newName}
                onChangeText={setNewName}
                editable={!saving}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="calendar-outline" size={20} color={colors.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Fecha de nacimiento (AAAA-MM-DD)"
                placeholderTextColor={colors.tertiary}
                value={newBirthDate}
                onChangeText={setNewBirthDate}
                editable={!saving}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.genderButton, newGender === 'M' && styles.genderActive]}
                onPress={() => setNewGender('M')}
                disabled={saving}
              >
                <Ionicons name="male" size={16} color={newGender === 'M' ? colors.background : colors.tertiary} />
                <Text style={[styles.genderText, newGender === 'M' && styles.genderTextActive]}>Masculino</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, newGender === 'F' && styles.genderActive]}
                onPress={() => setNewGender('F')}
                disabled={saving}
              >
                <Ionicons name="female" size={16} color={newGender === 'F' ? colors.background : colors.tertiary} />
                <Text style={[styles.genderText, newGender === 'F' && styles.genderTextActive]}>Femenino</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.7 }]}
              onPress={handleAddChild}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <QRModal visible={!!qrPaciente} onClose={() => setQrPaciente(null)} paciente={qrPaciente} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.secondary, marginTop: 24, marginBottom: 16 },

  widgetCard: { backgroundColor: colors.primary, borderColor: colors.primary },
  widgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconContainer: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 },
  widgetBadge: { backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: colors.primary, fontWeight: 'bold', fontSize: 12 },
  vaccineName: { fontSize: 20, fontWeight: 'bold', color: colors.background, marginBottom: 4 },
  childName: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  widgetButton: { backgroundColor: colors.background, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  widgetButtonText: { color: colors.secondary, fontWeight: 'bold', fontSize: 14 },

  familyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: colors.background, fontWeight: 'bold', fontSize: 14, marginLeft: 4 },

  childCard: { marginBottom: 12 },
  childRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  childInfo: { flex: 1 },
  childNameText: { fontSize: 16, fontWeight: 'bold', color: colors.secondary },
  childAgeText: { fontSize: 13, color: colors.tertiary, marginTop: 2 },
  childActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionIcon: { backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 8, borderRadius: 12 },

  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: colors.secondary, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: colors.tertiary, marginTop: 4, textAlign: 'center', marginBottom: 16 },
  emptyButton: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyButtonText: { color: colors.background, fontWeight: 'bold', fontSize: 14 },

  tipCard: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, backgroundColor: colors.background },
  tipTextContainer: { flex: 1, marginLeft: 16 },
  tipTitle: { fontSize: 16, fontWeight: 'bold', color: colors.secondary, marginBottom: 4 },
  tipDescription: { fontSize: 14, color: colors.tertiary, lineHeight: 20 },

  scanButton: { backgroundColor: colors.secondary, padding: 24, borderRadius: 20, alignItems: 'center', shadowColor: colors.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  scanIconBg: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 16, borderRadius: 20, marginBottom: 12 },
  scanTitle: { color: colors.background, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  scanDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: colors.background, padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: colors.secondary, marginTop: 8 },
  statLabel: { fontSize: 12, color: colors.tertiary, marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.secondary },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, height: 56, marginBottom: 12 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: colors.secondary, fontSize: 16 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  genderButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E5E7EB' },
  genderActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderText: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: colors.tertiary },
  genderTextActive: { color: colors.background },
  saveButton: { backgroundColor: colors.secondary, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: colors.background, fontSize: 16, fontWeight: 'bold' },
});
