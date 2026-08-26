import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { establecimientosService } from '../../services/establecimientos.service';

type TipoEst = 'Centro de Salud' | 'Farmacia';

export const CreateEstablishmentScreen = () => {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [tipo, setTipo] = useState<TipoEst>('Centro de Salud');
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (!nombre.trim() || !ciudad.trim()) {
      Alert.alert('Campos incompletos', 'Ingresa el nombre y la ciudad del establecimiento.');
      return;
    }
    setSaving(true);
    try {
      await establecimientosService.crear({
        nombre_establecimiento: nombre.trim(),
        ciudad_municipio: ciudad.trim(),
        tipo,
      });
      Alert.alert('Establecimiento creado', `"${nombre.trim()}" fue registrado correctamente.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear el establecimiento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo establecimiento</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nombre del establecimiento *</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="business-outline" size={18} color="#8e8e99" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej: Centro de Salud San Juan"
            placeholderTextColor="#8e8e99"
            autoCapitalize="words"
          />
        </View>

        <Text style={styles.label}>Ciudad / Municipio *</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="location-outline" size={18} color="#8e8e99" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={ciudad}
            onChangeText={setCiudad}
            placeholder="Ej: La Paz, Cochabamba, Santa Cruz..."
            placeholderTextColor="#8e8e99"
            autoCapitalize="words"
          />
        </View>

        <Text style={styles.label}>Tipo *</Text>
        <View style={styles.tipoRow}>
          {(['Centro de Salud', 'Farmacia'] as TipoEst[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tipoBtn, tipo === t && styles.tipoBtnActive]}
              onPress={() => setTipo(t)}
            >
              <Ionicons
                name={t === 'Farmacia' ? 'flask-outline' : 'business-outline'}
                size={20}
                color={tipo === t ? 'white' : '#8e8e99'}
              />
              <Text style={[styles.tipoText, tipo === t && styles.tipoTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
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
              <Text style={styles.saveBtnText}>Crear establecimiento</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  scroll: { flex: 1, padding: 20 },
  headerBar: {
    backgroundColor: '#553b5e', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 18,
  },
  headerTitle: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  label: { fontSize: 13, fontWeight: '700', color: '#553b5e', marginBottom: 8, marginTop: 16 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, height: 54,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#553b5e', fontSize: 15 },
  tipoRow: { flexDirection: 'row', gap: 12 },
  tipoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'white', borderRadius: 14, paddingVertical: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  tipoBtnActive: { backgroundColor: '#a281ba', borderColor: '#a281ba' },
  tipoText: { fontSize: 14, fontWeight: '600', color: '#8e8e99' },
  tipoTextActive: { color: 'white' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#a281ba', borderRadius: 16, height: 56, marginTop: 32,
  },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
