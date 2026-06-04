import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, FlatList, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase, createTempClient } from '../../lib/supabase';
import { RolUsuario, LABEL_ROL, ROLES_SALUD } from '../../types';

const ROLES_PARA_ADMIN_EST: RolUsuario[] = [...ROLES_SALUD, 'Tutor_PersonaNormal'];
const ROLES_PARA_SUPER: RolUsuario[] = ['AdminEstablecimiento', ...ROLES_SALUD, 'Tutor_PersonaNormal'];

const PRIMARY = '#a281ba';
const TEXT = '#1A1A2E';

export const CreateUserScreen = () => {
  const router = useRouter();
  const [miRol, setMiRol] = useState<RolUsuario | null>(null);
  const [miEstId, setMiEstId] = useState<string | null>(null);
  const [establecimientos, setEstablecimientos] = useState<any[]>([]);

  // Campos comunes
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [rolSeleccionado, setRolSeleccionado] = useState<RolUsuario | null>(null);
  const [estSeleccionado, setEstSeleccionado] = useState<string | null>(null);

  // Campos biológicos (solo para Tutor_PersonaNormal)
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState<'M' | 'F'>('M');
  const [esEmbarazada, setEsEmbarazada] = useState(false);

  const [showRoles, setShowRoles] = useState(false);
  const [showEst, setShowEst] = useState(false);
  const [saving, setSaving] = useState(false);

  const esTutor = rolSeleccionado === 'Tutor_PersonaNormal';

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: perfil } = await supabase
        .from('usuarios')
        .select('rol, id_establecimiento')
        .eq('id_usuario', session.user.id)
        .single();
      if (perfil) {
        setMiRol(perfil.rol);
        setMiEstId(perfil.id_establecimiento);
        if (perfil.id_establecimiento) setEstSeleccionado(perfil.id_establecimiento);
      }
      if (perfil?.rol === 'SuperAdmin') {
        const { data: ests } = await supabase
          .from('establecimientos')
          .select('id_establecimiento, nombre_establecimiento, ciudad_municipio')
          .order('nombre_establecimiento');
        setEstablecimientos(ests ?? []);
      }
    };
    init();
  }, []);

  const rolesDisponibles: RolUsuario[] =
    miRol === 'SuperAdmin' ? ROLES_PARA_SUPER : ROLES_PARA_ADMIN_EST;

  const crearUsuario = async () => {
    if (!nombre.trim() || !correo.trim() || !password.trim() || !rolSeleccionado) {
      Alert.alert('Campos incompletos', 'Completa nombre, correo, contraseña y rol.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Contraseña muy corta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (esTutor) {
      if (!fechaNacimiento.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
        Alert.alert('Fecha inválida', 'Ingresa la fecha de nacimiento en formato AAAA-MM-DD.');
        return;
      }
    }
    const necesitaEst = !esTutor;
    if (necesitaEst && !estSeleccionado) {
      Alert.alert('Establecimiento requerido', 'Selecciona el establecimiento al que pertenece este usuario.');
      return;
    }

    setSaving(true);
    try {
      // 1. Crear en Supabase Auth con cliente temporal
      const tempClient = createTempClient();
      const { data: authData, error: authErr } = await tempClient.auth.signUp({
        email: correo.trim().toLowerCase(),
        password,
      });
      if (authErr) throw authErr;
      if (!authData.user) throw new Error('No se pudo crear el usuario en el sistema de autenticación.');

      // 2. Insertar en tabla usuarios
      const { error: dbErr } = await supabase.from('usuarios').insert([{
        id_usuario: authData.user.id,
        nombre_completo: nombre.trim(),
        correo_electronico: correo.trim().toLowerCase(),
        rol: rolSeleccionado,
        id_establecimiento: necesitaEst ? estSeleccionado : null,
        password_hash: '',
        tiene_hijos: esTutor,
      }]);
      if (dbErr) throw dbErr;

      // 3. Si es Tutor, crear también su carnet en pacientes
      if (esTutor) {
        const token = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `biosafe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const { error: pacErr } = await supabase.from('pacientes').insert([{
          id_tutor_registro: authData.user.id,
          nombre_completo: nombre.trim(),
          fecha_nacimiento: fechaNacimiento.trim(),
          sexo,
          es_embarazada: sexo === 'F' ? esEmbarazada : false,
          codigo_qr_token: token,
        }]);
        if (pacErr) throw pacErr;
      }

      Alert.alert(
        'Usuario creado',
        esTutor
          ? `${nombre.trim()} fue registrado como Padre/Tutor y su carnet digital fue generado.`
          : `${nombre.trim()} fue creado como ${LABEL_ROL[rolSeleccionado]}.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      if (e.message?.includes('already registered')) {
        Alert.alert('Correo duplicado', 'Ya existe una cuenta con este correo electrónico.');
      } else {
        Alert.alert('Error al crear usuario', e.message ?? 'Inténtalo de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const estNombre = establecimientos.find((e) => e.id_establecimiento === estSeleccionado)?.nombre_establecimiento;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear usuario</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <Text style={styles.label}>Nombre completo *</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={18} color="#8e8e99" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej: María López García"
            placeholderTextColor="#8e8e99"
            autoCapitalize="words"
          />
        </View>

        <Text style={styles.label}>Correo electrónico *</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={18} color="#8e8e99" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={correo}
            onChangeText={setCorreo}
            placeholder="usuario@ejemplo.com"
            placeholderTextColor="#8e8e99"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.label}>Contraseña temporal *</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color="#8e8e99" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor="#8e8e99"
            secureTextEntry
          />
        </View>

        <Text style={styles.label}>Rol *</Text>
        <TouchableOpacity style={styles.picker} onPress={() => setShowRoles(true)}>
          <Text style={rolSeleccionado ? styles.pickerValue : styles.pickerPlaceholder}>
            {rolSeleccionado ? LABEL_ROL[rolSeleccionado] : 'Seleccionar rol'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#8e8e99" />
        </TouchableOpacity>

        {/* Campos biológicos solo para Tutor */}
        {esTutor && (
          <>
            <View style={styles.sectionDivider}>
              <Ionicons name="person-circle-outline" size={16} color={PRIMARY} />
              <Text style={styles.sectionDividerText}>Datos del carnet digital</Text>
            </View>

            <Text style={styles.label}>Fecha de nacimiento *</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="calendar-outline" size={18} color="#8e8e99" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={fechaNacimiento}
                onChangeText={setFechaNacimiento}
                placeholder="AAAA-MM-DD (Ej: 1990-05-15)"
                placeholderTextColor="#8e8e99"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <Text style={styles.label}>Sexo *</Text>
            <View style={styles.sexoRow}>
              <TouchableOpacity
                style={[styles.sexoBtn, sexo === 'M' && styles.sexoBtnActive]}
                onPress={() => { setSexo('M'); setEsEmbarazada(false); }}
              >
                <Ionicons name="male" size={18} color={sexo === 'M' ? 'white' : '#8e8e99'} />
                <Text style={[styles.sexoText, sexo === 'M' && styles.sexoTextActive]}>Masculino</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sexoBtn, sexo === 'F' && styles.sexoBtnActive]}
                onPress={() => setSexo('F')}
              >
                <Ionicons name="female" size={18} color={sexo === 'F' ? 'white' : '#8e8e99'} />
                <Text style={[styles.sexoText, sexo === 'F' && styles.sexoTextActive]}>Femenino</Text>
              </TouchableOpacity>
            </View>

            {sexo === 'F' && (
              <View style={styles.embarazadaRow}>
                <View style={styles.embarazadaLeft}>
                  <Ionicons name="heart-outline" size={18} color="#ec4899" />
                  <Text style={styles.embarazadaLabel}>¿Está embarazada actualmente?</Text>
                </View>
                <Switch
                  value={esEmbarazada}
                  onValueChange={setEsEmbarazada}
                  trackColor={{ false: '#E5E7EB', true: '#fbcfe8' }}
                  thumbColor={esEmbarazada ? '#ec4899' : '#f4f3f4'}
                />
              </View>
            )}
          </>
        )}

        {/* Establecimiento (solo para personal de salud / admin) */}
        {rolSeleccionado && !esTutor && (
          <>
            <Text style={styles.label}>
              Establecimiento *{miRol === 'AdminEstablecimiento' ? ' (asignado automáticamente)' : ''}
            </Text>
            {miRol === 'SuperAdmin' ? (
              <TouchableOpacity style={styles.picker} onPress={() => setShowEst(true)}>
                <Text style={estSeleccionado ? styles.pickerValue : styles.pickerPlaceholder}>
                  {estNombre ?? 'Seleccionar establecimiento'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#8e8e99" />
              </TouchableOpacity>
            ) : (
              <View style={[styles.picker, { backgroundColor: '#F3F4F6' }]}>
                <Text style={styles.pickerValue}>
                  {establecimientos.find((e) => e.id_establecimiento === miEstId)?.nombre_establecimiento ?? 'Tu establecimiento'}
                </Text>
              </View>
            )}
          </>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.65 }]}
          onPress={crearUsuario}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="person-add" size={20} color="white" />
              <Text style={styles.saveBtnText}>Crear usuario</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal roles */}
      <Modal visible={showRoles} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar rol</Text>
              <TouchableOpacity onPress={() => setShowRoles(false)}>
                <Ionicons name="close" size={24} color={TEXT} />
              </TouchableOpacity>
            </View>
            {rolesDisponibles.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.opcion, rolSeleccionado === r && styles.opcionActive]}
                onPress={() => { setRolSeleccionado(r); setShowRoles(false); }}
              >
                <Text style={[styles.opcionText, rolSeleccionado === r && styles.opcionTextActive]}>
                  {LABEL_ROL[r]}
                </Text>
                {rolSeleccionado === r && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Modal establecimientos */}
      <Modal visible={showEst} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Establecimiento</Text>
              <TouchableOpacity onPress={() => setShowEst(false)}>
                <Ionicons name="close" size={24} color={TEXT} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={establecimientos}
              keyExtractor={(item) => item.id_establecimiento}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.opcion, estSeleccionado === item.id_establecimiento && styles.opcionActive]}
                  onPress={() => { setEstSeleccionado(item.id_establecimiento); setShowEst(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.opcionText, estSeleccionado === item.id_establecimiento && styles.opcionTextActive]}>
                      {item.nombre_establecimiento}
                    </Text>
                    <Text style={styles.opcionSub}>{item.ciudad_municipio}</Text>
                  </View>
                  {estSeleccionado === item.id_establecimiento && (
                    <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />
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
    backgroundColor: '#1A1A2E', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 18,
  },
  headerTitle: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  label: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 8, marginTop: 16 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, height: 54,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: TEXT, fontSize: 15 },
  picker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'white', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 15,
  },
  pickerPlaceholder: { color: '#8e8e99', fontSize: 15, flex: 1 },
  pickerValue: { color: TEXT, fontSize: 15, fontWeight: '600', flex: 1 },

  sectionDivider: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 24, marginBottom: 4,
    paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(162,129,186,0.25)',
  },
  sectionDividerText: { fontSize: 13, fontWeight: '700', color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.5 },

  sexoRow: { flexDirection: 'row', gap: 12 },
  sexoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'white', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  sexoBtnActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  sexoText: { fontSize: 14, fontWeight: '600', color: '#8e8e99' },
  sexoTextActive: { color: 'white' },

  embarazadaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fdf2f8', padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#fbcfe8', marginTop: 12,
  },
  embarazadaLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  embarazadaLabel: { fontSize: 14, fontWeight: '600', color: '#be185d', flex: 1 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: PRIMARY, borderRadius: 16, height: 56, marginTop: 28,
  },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '70%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: TEXT },
  opcion: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  opcionActive: { backgroundColor: 'rgba(162,129,186,0.06)' },
  opcionText: { fontSize: 15, color: TEXT, flex: 1 },
  opcionTextActive: { fontWeight: '700', color: PRIMARY },
  opcionSub: { fontSize: 12, color: '#8e8e99', marginTop: 2 },
});
