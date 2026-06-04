import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export const RegisterDoseScreen = () => {
  const { id_paciente } = useLocalSearchParams<{ id_paciente: string }>();
  const router = useRouter();
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [vacunaSeleccionada, setVacunaSeleccionada] = useState<any>(null);
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [lote, setLote] = useState('');
  const [proximaCita, setProximaCita] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCatalogo, setShowCatalogo] = useState(false);
  const [paciente, setPaciente] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const [resPaciente, resCatalogo] = await Promise.all([
        supabase.from('pacientes').select('nombre_completo').eq('id_paciente', id_paciente).single(),
        supabase.from('cat_vacunas_oficiales').select('*').order('edad_meses_ideal', { ascending: true }),
      ]);
      if (resPaciente.data) setPaciente(resPaciente.data);
      if (resCatalogo.data) setCatalogo(resCatalogo.data);
    };
    init();
  }, [id_paciente]);

  const guardar = async () => {
    if (!vacunaSeleccionada) {
      Alert.alert('Vacuna requerida', 'Selecciona la vacuna a registrar.');
      return;
    }
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      Alert.alert('Fecha inválida', 'Usa el formato AAAA-MM-DD.');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const payload: any = {
        id_paciente,
        id_vacuna: vacunaSeleccionada.id_vacuna,
        id_usuario_atendedor: session.user.id,
        fecha_aplicacion: new Date(fecha).toISOString(),
        origen_registro: 'Validado_En_Establecimiento',
        lote: lote.trim() || null,
        fecha_vencimiento_proxima: proximaCita && /^\d{4}-\d{2}-\d{2}$/.test(proximaCita)
          ? new Date(proximaCita).toISOString()
          : null,
      };

      const { error } = await supabase.from('dosis_aplicadas').insert([payload]);
      if (error) throw error;

      Alert.alert('Dosis registrada', `Se registró ${vacunaSeleccionada.nombre_enfermedad} correctamente.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      if (e.code === '23505') {
        Alert.alert('Ya registrada', 'Esta dosis ya fue registrada para este paciente.');
      } else {
        Alert.alert('Error', e.message ?? 'No se pudo guardar la dosis.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registrar Dosis</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {paciente && (
          <View style={styles.pacienteInfo}>
            <Ionicons name="person-circle" size={20} color="#a281ba" />
            <Text style={styles.pacienteNombre}>{paciente.nombre_completo}</Text>
          </View>
        )}

        {/* Vacuna */}
        <Text style={styles.label}>Vacuna *</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowCatalogo(true)}>
          {vacunaSeleccionada ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.pickerValue}>{vacunaSeleccionada.nombre_enfermedad}</Text>
              <Text style={styles.pickerSub}>{vacunaSeleccionada.dosis_numero}</Text>
            </View>
          ) : (
            <Text style={styles.pickerPlaceholder}>Seleccionar vacuna del catálogo PAI</Text>
          )}
          <Ionicons name="chevron-down" size={18} color="#8e8e99" />
        </TouchableOpacity>

        {/* Fecha */}
        <Text style={styles.label}>Fecha de aplicación *</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="calendar-outline" size={18} color="#8e8e99" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={fecha}
            onChangeText={setFecha}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#8e8e99"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* Lote */}
        <Text style={styles.label}>Número de lote</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="barcode-outline" size={18} color="#8e8e99" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={lote}
            onChangeText={setLote}
            placeholder="Ej: LT-2024-001 (opcional)"
            placeholderTextColor="#8e8e99"
            autoCapitalize="characters"
          />
        </View>

        {/* Próxima cita */}
        <Text style={styles.label}>Próxima cita (fecha de refuerzo)</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="alarm-outline" size={18} color="#8e8e99" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={proximaCita}
            onChangeText={setProximaCita}
            placeholder="AAAA-MM-DD (opcional)"
            placeholderTextColor="#8e8e99"
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.65 }]}
          onPress={guardar}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.saveBtnText}>Guardar dosis</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal catálogo */}
      <Modal visible={showCatalogo} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Catálogo PAI Bolivia</Text>
              <TouchableOpacity onPress={() => setShowCatalogo(false)}>
                <Ionicons name="close" size={24} color="#553b5e" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={catalogo}
              keyExtractor={(item) => item.id_vacuna}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.catalogoItem,
                    vacunaSeleccionada?.id_vacuna === item.id_vacuna && styles.catalogoItemActive,
                  ]}
                  onPress={() => {
                    setVacunaSeleccionada(item);
                    setShowCatalogo(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catalogoNombre}>{item.nombre_enfermedad}</Text>
                    <Text style={styles.catalogoDosis}>{item.dosis_numero} · {item.edad_meses_ideal} meses</Text>
                  </View>
                  {vacunaSeleccionada?.id_vacuna === item.id_vacuna && (
                    <Ionicons name="checkmark-circle" size={20} color="#a281ba" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  scroll: { flex: 1, padding: 20 },
  headerBar: {
    backgroundColor: '#553b5e',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 18,
  },
  headerTitle: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  pacienteInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(162,129,186,0.08)',
    padding: 14, borderRadius: 14, marginBottom: 20,
  },
  pacienteNombre: { fontSize: 15, fontWeight: '700', color: '#a281ba' },
  label: { fontSize: 13, fontWeight: '700', color: '#553b5e', marginBottom: 8, marginTop: 16 },
  picker: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
  },
  pickerPlaceholder: { flex: 1, color: '#8e8e99', fontSize: 15 },
  pickerValue: { color: '#553b5e', fontSize: 15, fontWeight: '600' },
  pickerSub: { color: '#8e8e99', fontSize: 12, marginTop: 2 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 16, height: 54,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#553b5e', fontSize: 15 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#a281ba', borderRadius: 16, height: 56, marginTop: 28,
  },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#553b5e' },
  catalogoItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  catalogoItemActive: { backgroundColor: 'rgba(162,129,186,0.05)' },
  catalogoNombre: { fontSize: 14, fontWeight: '700', color: '#553b5e' },
  catalogoDosis: { fontSize: 12, color: '#8e8e99', marginTop: 2 },
});
