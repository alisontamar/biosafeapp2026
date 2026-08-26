import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { pacientesVacunacionService } from '../../services/pacientesVacunacion.service';
import type { Vaccine } from '../../types';

export const VaccineCatalogScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [catalogo, setCatalogo] = useState<Vaccine[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Vaccine | null>(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [dosisNumEdit, setDosisNumEdit] = useState('');
  const [edadEdit, setEdadEdit] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pacientesVacunacionService.listarCatalogoVacunas();
      setCatalogo(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirCrear = () => {
    setEditando(null);
    setNombreEdit('');
    setDosisNumEdit('');
    setEdadEdit('');
    setShowModal(true);
  };

  const abrirEditar = (v: Vaccine) => {
    setEditando(v);
    setNombreEdit(v.nombre_enfermedad);
    setDosisNumEdit(v.dosis_numero);
    setEdadEdit(String(v.edad_meses_ideal));
    setShowModal(true);
  };

  const guardar = async () => {
    const edadNum = parseInt(edadEdit, 10);
    if (!nombreEdit.trim() || !dosisNumEdit.trim() || Number.isNaN(edadNum) || edadNum < 0) {
      Alert.alert('Datos inválidos', 'Completa nombre, número de dosis y la edad ideal (en meses, un número).');
      return;
    }
    setGuardando(true);
    try {
      if (editando) {
        await pacientesVacunacionService.actualizarVacunaCatalogo({
          id_vacuna: editando.id_vacuna,
          nombre_enfermedad: nombreEdit.trim(),
          dosis_numero: dosisNumEdit.trim(),
          edad_meses_ideal: edadNum,
        });
      } else {
        await pacientesVacunacionService.crearVacunaCatalogo({
          nombre_enfermedad: nombreEdit.trim(),
          dosis_numero: dosisNumEdit.trim(),
          edad_meses_ideal: edadNum,
        });
      }
      setShowModal(false);
      cargar();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar la vacuna.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = () => {
    if (!editando) return;
    Alert.alert(
      'Eliminar vacuna',
      `¿Eliminar "${editando.nombre_enfermedad} — ${editando.dosis_numero}" del catálogo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: eliminar },
      ],
    );
  };

  const eliminar = async () => {
    if (!editando) return;
    setGuardando(true);
    try {
      await pacientesVacunacionService.eliminarVacunaCatalogo({ id_vacuna: editando.id_vacuna });
      setShowModal(false);
      cargar();
    } catch (e) {
      Alert.alert('No se pudo eliminar', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#a281ba" /></View>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Catálogo de Vacunas</Text>
          <Text style={styles.headerSub}>{catalogo.length} vacunas · Esquema PAI</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={abrirCrear}>
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={catalogo}
        keyExtractor={(item) => item.id_vacuna}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="medkit-outline" size={52} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Catálogo vacío</Text>
            <Text style={styles.emptyDesc}>Agrega la primera vacuna del esquema PAI.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => abrirEditar(item)}>
            <View style={styles.cardIcon}>
              <Ionicons name="medkit" size={20} color="#a281ba" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardNombre}>{item.nombre_enfermedad}</Text>
              <Text style={styles.cardDetalle}>{item.dosis_numero} · Edad ideal: {item.edad_meses_ideal} meses</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>
        )}
      />

      {/* Modal crear/editar */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editando ? 'Editar vacuna' : 'Nueva vacuna'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#553b5e" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Nombre de la enfermedad/vacuna</Text>
            <TextInput
              style={styles.input}
              value={nombreEdit}
              onChangeText={setNombreEdit}
              placeholder="Ej: Pentavalente"
              placeholderTextColor="#8e8e99"
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>Número de dosis</Text>
            <TextInput
              style={styles.input}
              value={dosisNumEdit}
              onChangeText={setDosisNumEdit}
              placeholder="Ej: 1ra dosis"
              placeholderTextColor="#8e8e99"
            />

            <Text style={styles.fieldLabel}>Edad ideal (en meses)</Text>
            <TextInput
              style={styles.input}
              value={edadEdit}
              onChangeText={setEdadEdit}
              placeholder="Ej: 2"
              placeholderTextColor="#8e8e99"
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[styles.saveBtn, guardando && { opacity: 0.6 }]}
              onPress={guardar}
              disabled={guardando}
            >
              {guardando ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
            </TouchableOpacity>

            {editando && (
              <TouchableOpacity style={styles.deleteBtn} onPress={confirmarEliminar} disabled={guardando}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={styles.deleteBtnText}>Eliminar del catálogo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
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
  headerTitle: { color: 'white', fontSize: 17, fontWeight: 'bold', textAlign: 'center' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2, textAlign: 'center' },
  addBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardIcon: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(162,129,186,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  cardNombre: { fontSize: 14, fontWeight: '700', color: '#553b5e' },
  cardDetalle: { fontSize: 12, color: '#8e8e99', marginTop: 2 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#553b5e', marginTop: 14, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: '#8e8e99', marginTop: 6, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#553b5e' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#8e8e99', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    backgroundColor: '#F8F9FA', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#553b5e',
  },
  saveBtn: {
    backgroundColor: '#a281ba', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 20,
  },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 14, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#FEE2E2',
  },
  deleteBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
});
