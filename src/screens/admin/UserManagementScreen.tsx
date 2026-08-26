import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usuariosService } from '../../services/usuarios.service';
import { LABEL_ROL, RolUsuario, ROLES_SALUD } from '../../types';

const ROL_COLOR: Partial<Record<RolUsuario, string>> = {
  SuperAdmin: '#a281ba',
  AdminEstablecimiento: '#8f6faa',
  Medico: '#a281ba',
  Enfermero: '#0D9488',
  Farmaceutico: '#D97706',
  Tutor_PersonaNormal: '#10B981',
};

const ROLES_EDITABLES_ADMIN_EST: RolUsuario[] = [...ROLES_SALUD, 'Tutor_PersonaNormal'];
const ROLES_EDITABLES_SUPER: RolUsuario[] = ['AdminEstablecimiento', ...ROLES_SALUD, 'Tutor_PersonaNormal'];

type UsuarioItem = {
  id_usuario: string;
  nombre_completo: string;
  correo_electronico: string;
  rol: RolUsuario;
  activo: boolean;
  establecimientos?: { nombre_establecimiento: string } | null;
};

export const UserManagementScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [miRol, setMiRol] = useState<RolUsuario | null>(null);

  const [seleccionado, setSeleccionado] = useState<UsuarioItem | null>(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [rolEdit, setRolEdit] = useState<RolUsuario | null>(null);
  const [showRoles, setShowRoles] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [perfil, usuarios] = await Promise.all([
        usuariosService.obtenerPerfil(),
        usuariosService.listarUsuarios(),
      ]);
      setMiRol(perfil.rol as RolUsuario);
      setUsuarios(usuarios);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = usuarios.filter(
    (u) =>
      u.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.correo_electronico.toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirGestion = (u: UsuarioItem) => {
    setSeleccionado(u);
    setNombreEdit(u.nombre_completo);
    setRolEdit(u.rol);
  };

  const cerrarGestion = () => {
    setSeleccionado(null);
    setShowRoles(false);
  };

  const rolesDisponibles = miRol === 'SuperAdmin' ? ROLES_EDITABLES_SUPER : ROLES_EDITABLES_ADMIN_EST;

  const guardarCambios = async () => {
    if (!seleccionado) return;
    setGuardando(true);
    try {
      await usuariosService.actualizarUsuario({
        id_usuario: seleccionado.id_usuario,
        nombre_completo: nombreEdit.trim() || undefined,
        rol: rolEdit && rolEdit !== seleccionado.rol ? rolEdit : undefined,
      });
      cerrarGestion();
      cargar();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar el cambio.');
    } finally {
      setGuardando(false);
    }
  };

  const alternarActivo = async () => {
    if (!seleccionado) return;
    setGuardando(true);
    try {
      await usuariosService.cambiarEstadoUsuario({
        id_usuario: seleccionado.id_usuario,
        activo: !seleccionado.activo,
      });
      cerrarGestion();
      cargar();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo cambiar el estado.');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = () => {
    if (!seleccionado) return;
    Alert.alert(
      'Eliminar usuario',
      `¿Eliminar a ${seleccionado.nombre_completo} definitivamente? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: eliminarUsuario },
      ],
    );
  };

  const eliminarUsuario = async () => {
    if (!seleccionado) return;
    setGuardando(true);
    try {
      await usuariosService.eliminarUsuario({ id_usuario: seleccionado.id_usuario });
      cerrarGestion();
      cargar();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar el usuario.');
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
        <View>
          <Text style={styles.headerTitle}>Usuarios</Text>
          <Text style={styles.headerSub}>{usuarios.length} registrados</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(adminTabs)/create-user')}
        >
          <Ionicons name="person-add" size={18} color="white" />
          <Text style={styles.addBtnText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#8e8e99" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o correo..."
          placeholderTextColor="#8e8e99"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      <FlatList
        data={filtrados}
        keyExtractor={(item) => item.id_usuario}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Sin usuarios</Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = ROL_COLOR[item.rol] ?? '#8e8e99';
          return (
            <TouchableOpacity style={[styles.card, !item.activo && styles.cardInactivo]} onPress={() => abrirGestion(item)}>
              <View style={[styles.avatar, { backgroundColor: `${color}18` }]}>
                <Ionicons name="person" size={20} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre}>{item.nombre_completo}</Text>
                <Text style={styles.email} numberOfLines={1}>{item.correo_electronico}</Text>
                {item.establecimientos && (
                  <Text style={styles.est} numberOfLines={1}>{item.establecimientos.nombre_establecimiento}</Text>
                )}
                {!item.activo && <Text style={styles.inactivoTag}>Desactivado</Text>}
              </View>
              <View style={[styles.rolBadge, { backgroundColor: `${color}18` }]}>
                <Text style={[styles.rolText, { color }]}>
                  {LABEL_ROL[item.rol] ?? item.rol}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          );
        }}
      />

      {/* Modal de gestión */}
      <Modal visible={!!seleccionado} animationType="slide" transparent onRequestClose={cerrarGestion}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gestionar usuario</Text>
              <TouchableOpacity onPress={cerrarGestion}>
                <Ionicons name="close" size={24} color="#553b5e" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              value={nombreEdit}
              onChangeText={setNombreEdit}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>Rol</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowRoles((s) => !s)}>
              <Text style={styles.pickerValue}>{rolEdit ? LABEL_ROL[rolEdit] : ''}</Text>
              <Ionicons name={showRoles ? 'chevron-up' : 'chevron-down'} size={18} color="#8e8e99" />
            </TouchableOpacity>
            {showRoles && (
              <View style={styles.rolesDropdown}>
                {rolesDisponibles.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={styles.rolesItem}
                    onPress={() => { setRolEdit(r); setShowRoles(false); }}
                  >
                    <Text style={styles.rolesItemText}>{LABEL_ROL[r]}</Text>
                    {rolEdit === r && <Ionicons name="checkmark" size={16} color="#a281ba" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, guardando && { opacity: 0.6 }]}
              onPress={guardarCambios}
              disabled={guardando}
            >
              <Text style={styles.saveBtnText}>Guardar cambios</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.estadoRow}>
              <Text style={styles.estadoLabel}>
                {seleccionado?.activo ? 'Cuenta activa' : 'Cuenta desactivada'}
              </Text>
              <Switch
                value={!!seleccionado?.activo}
                onValueChange={alternarActivo}
                disabled={guardando}
                trackColor={{ false: '#E5E7EB', true: '#a281ba' }}
              />
            </View>
            <Text style={styles.hint}>
              Desactivar bloquea el acceso a la app sin borrar su historial. Reversible.
            </Text>

            <TouchableOpacity style={styles.deleteBtn} onPress={confirmarEliminar} disabled={guardando}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={styles.deleteBtnText}>Eliminar usuario definitivamente</Text>
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
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#a281ba', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'white', margin: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, height: 48,
  },
  searchInput: { flex: 1, color: '#553b5e', fontSize: 15 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardInactivo: { opacity: 0.6 },
  avatar: {
    width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center',
  },
  nombre: { fontSize: 14, fontWeight: '700', color: '#553b5e' },
  email: { fontSize: 12, color: '#8e8e99', marginTop: 2 },
  est: { fontSize: 11, color: '#8e8e99', marginTop: 1 },
  inactivoTag: { fontSize: 11, color: '#EF4444', fontWeight: '700', marginTop: 2 },
  rolBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  rolText: { fontSize: 11, fontWeight: '700' },
  emptyTitle: { fontSize: 15, color: '#8e8e99', marginTop: 12, textAlign: 'center' },

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
  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8F9FA', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  pickerValue: { fontSize: 15, color: '#553b5e', fontWeight: '600' },
  rolesDropdown: {
    backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    marginTop: 6, overflow: 'hidden',
  },
  rolesItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  rolesItemText: { fontSize: 14, color: '#553b5e' },
  saveBtn: {
    backgroundColor: '#a281ba', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 20,
  },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 20 },
  estadoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  estadoLabel: { fontSize: 14, fontWeight: '700', color: '#553b5e' },
  hint: { fontSize: 12, color: '#8e8e99', marginTop: 6 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 24, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#FEE2E2',
  },
  deleteBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
});
