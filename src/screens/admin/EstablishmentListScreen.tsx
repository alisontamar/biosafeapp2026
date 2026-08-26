import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { usuariosService } from '../../services/usuarios.service';
import { establecimientosService } from '../../services/establecimientos.service';
import type { TipoEstablecimiento } from '../../types';

type EstablecimientoItem = {
  id_establecimiento: string;
  nombre_establecimiento: string;
  ciudad_municipio: string;
  tipo: TipoEstablecimiento;
  fecha_registro: string;
};

export const EstablishmentListScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [establecimientos, setEstablecimientos] = useState<EstablecimientoItem[]>([]);
  const [rol, setRol] = useState<string>('');
  const [miEstablecimiento, setMiEstablecimiento] = useState<any>(null);

  const [seleccionado, setSeleccionado] = useState<EstablecimientoItem | null>(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [ciudadEdit, setCiudadEdit] = useState('');
  const [tipoEdit, setTipoEdit] = useState<TipoEstablecimiento>('Centro de Salud');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const perfil = await usuariosService.obtenerPerfil();
      if (!perfil) return;
      setRol(perfil.rol);

      if (perfil.rol === 'SuperAdmin') {
        const data = await establecimientosService.listar();
        setEstablecimientos(data ?? []);
      } else {
        // AdminEstablecimiento ve sólo el suyo
        if (perfil.id_establecimiento) {
          const data = await establecimientosService.obtenerPorId({ id_establecimiento: perfil.id_establecimiento });
          setMiEstablecimiento(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirGestion = (est: EstablecimientoItem) => {
    setSeleccionado(est);
    setNombreEdit(est.nombre_establecimiento);
    setCiudadEdit(est.ciudad_municipio);
    setTipoEdit(est.tipo);
  };

  const cerrarGestion = () => setSeleccionado(null);

  const guardarCambios = async () => {
    if (!seleccionado) return;
    if (!nombreEdit.trim() || !ciudadEdit.trim()) {
      Alert.alert('Campos incompletos', 'Nombre y ciudad no pueden estar vacíos.');
      return;
    }
    setGuardando(true);
    try {
      await establecimientosService.actualizar({
        id_establecimiento: seleccionado.id_establecimiento,
        nombre_establecimiento: nombreEdit.trim(),
        ciudad_municipio: ciudadEdit.trim(),
        tipo: tipoEdit,
      });
      cerrarGestion();
      cargar();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar el cambio.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = () => {
    if (!seleccionado) return;
    Alert.alert(
      'Eliminar establecimiento',
      `¿Eliminar "${seleccionado.nombre_establecimiento}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: eliminar },
      ],
    );
  };

  const eliminar = async () => {
    if (!seleccionado) return;
    setGuardando(true);
    try {
      await establecimientosService.eliminar({ id_establecimiento: seleccionado.id_establecimiento });
      cerrarGestion();
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

  if (rol === 'AdminEstablecimiento') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Mi Establecimiento</Text>
        </View>
        {miEstablecimiento ? (
          <View style={styles.miEstCard}>
            <View style={styles.estIcon}>
              <Ionicons name="business" size={28} color="#a281ba" />
            </View>
            <Text style={styles.estNombre}>{miEstablecimiento.nombre_establecimiento}</Text>
            <View style={styles.estPills}>
              <View style={styles.pill}>
                <Ionicons name="location-outline" size={13} color="#a281ba" />
                <Text style={styles.pillText}>{miEstablecimiento.ciudad_municipio}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="medkit-outline" size={13} color="#10B981" />
                <Text style={[styles.pillText, { color: '#10B981' }]}>{miEstablecimiento.tipo}</Text>
              </View>
            </View>
            <Text style={styles.estId}>ID: {miEstablecimiento.id_establecimiento}</Text>
          </View>
        ) : (
          <View style={styles.center}>
            <Ionicons name="business-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No tienes un establecimiento asignado</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // SuperAdmin view
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Centros de Salud</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(adminTabs)/create-establishment')}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addBtnText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {establecimientos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="business-outline" size={52} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Sin establecimientos registrados</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/(adminTabs)/create-establishment')}
          >
            <Text style={styles.emptyBtnText}>+ Crear primero</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={establecimientos}
          keyExtractor={(item) => item.id_establecimiento}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => abrirGestion(item)}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name={item.tipo === 'Farmacia' ? 'flask' : 'business'}
                  size={22}
                  color="#a281ba"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardNombre}>{item.nombre_establecimiento}</Text>
                <Text style={styles.cardDetalle}>{item.ciudad_municipio} · {item.tipo}</Text>
              </View>
              <Text style={styles.cardFecha}>
                {new Date(item.fecha_registro).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: '2-digit' })}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal de gestión */}
      <Modal visible={!!seleccionado} animationType="slide" transparent onRequestClose={cerrarGestion}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar establecimiento</Text>
              <TouchableOpacity onPress={cerrarGestion}>
                <Ionicons name="close" size={24} color="#553b5e" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Nombre</Text>
            <TextInput style={styles.input} value={nombreEdit} onChangeText={setNombreEdit} autoCapitalize="words" />

            <Text style={styles.fieldLabel}>Ciudad / Municipio</Text>
            <TextInput style={styles.input} value={ciudadEdit} onChangeText={setCiudadEdit} autoCapitalize="words" />

            <Text style={styles.fieldLabel}>Tipo</Text>
            <View style={styles.tipoRow}>
              {(['Centro de Salud', 'Farmacia'] as TipoEstablecimiento[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tipoBtn, tipoEdit === t && styles.tipoBtnActive]}
                  onPress={() => setTipoEdit(t)}
                >
                  <Text style={[styles.tipoText, tipoEdit === t && styles.tipoTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, guardando && { opacity: 0.6 }]}
              onPress={guardarCambios}
              disabled={guardando}
            >
              <Text style={styles.saveBtnText}>Guardar cambios</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={confirmarEliminar} disabled={guardando}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={styles.deleteBtnText}>Eliminar establecimiento</Text>
            </TouchableOpacity>
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
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#a281ba', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(162,129,186,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  cardNombre: { fontSize: 15, fontWeight: '700', color: '#553b5e' },
  cardDetalle: { fontSize: 12, color: '#8e8e99', marginTop: 2 },
  cardFecha: { fontSize: 11, color: '#8e8e99' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#553b5e', marginTop: 14, textAlign: 'center' },
  emptyBtn: { marginTop: 16, backgroundColor: '#a281ba', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  emptyText: { fontSize: 14, color: '#8e8e99', marginTop: 12, textAlign: 'center' },
  miEstCard: {
    backgroundColor: 'white', margin: 20, borderRadius: 20, padding: 28,
    alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  estIcon: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(162,129,186,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  estNombre: { fontSize: 20, fontWeight: 'bold', color: '#553b5e', textAlign: 'center' },
  estPills: { flexDirection: 'row', gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(162,129,186,0.08)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  pillText: { color: '#a281ba', fontWeight: '600', fontSize: 12 },
  estId: { fontSize: 11, color: '#8e8e99', marginTop: 4 },

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
  tipoRow: { flexDirection: 'row', gap: 10 },
  tipoBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E5E7EB',
  },
  tipoBtnActive: { backgroundColor: '#a281ba', borderColor: '#a281ba' },
  tipoText: { fontSize: 13, fontWeight: '600', color: '#8e8e99' },
  tipoTextActive: { color: 'white' },
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
