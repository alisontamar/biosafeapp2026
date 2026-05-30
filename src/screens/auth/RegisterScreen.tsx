// src/screens/auth/RegisterScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, SafeAreaView, Alert, ActivityIndicator,
  ScrollView, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { supabase } from '../../lib/supabase';

export const RegisterScreen = () => {
  const router = useRouter();
  
  // Estados originales
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // NUEVOS ESTADOS BIOLÓGICOS (Igual que en la web)
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [isPregnant, setIsPregnant] = useState(false);
  
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!fullName.trim() || !email.trim() || !password || !birthDate.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos.');
      return false;
    }
    // Validación súper básica para formato de fecha YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate)) {
      Alert.alert('Error', 'La fecha debe tener el formato AAAA-MM-DD (Ej: 1995-10-25)');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // 1. Crear el usuario oficial en el sistema de autenticación
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Crear perfil en la tabla 'usuarios'
        const { error: insertUserError } = await supabase.from('usuarios').insert([
          {
            id_usuario: authData.user.id,
            nombre_completo: fullName.trim(),
            correo_electronico: email.trim(), // Nombre exacto según tu DB
            password_hash: password, // En un MVP esto es pasable, en prod usa solo el Auth
            rol: 'Tutor_PersonaNormal',
            tiene_hijos: true, // Asumimos que sí porque se registra como Tutor
          }
        ]);

        if (insertUserError) throw insertUserError;

        // 3. Generar Token Seguro (Compatible con Expo/React Native)
        const tokenUnico = typeof crypto !== 'undefined' && crypto.randomUUID 
          ? crypto.randomUUID() 
          : `biosafe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 4. Crear su expediente clínico en la tabla 'pacientes'
        const { error: insertPacError } = await supabase.from('pacientes').insert([
          {
            id_tutor_registro: authData.user.id, // Él mismo es su tutor
            nombre_completo: fullName.trim(),
            fecha_nacimiento: birthDate.trim(),
            sexo: gender,
            es_embarazada: gender === 'F' ? isPregnant : false,
            codigo_qr_token: tokenUnico
          }
        ]);

        if (insertPacError) throw insertPacError;

        Alert.alert(
          '¡Bienvenido a BioSafe!', 
          'Tu cuenta y tu carnet digital han sido creados exitosamente.',
          [{ text: 'Entrar a la app', onPress: () => router.replace('/home') }]
        );
      }
    } catch (error: any) {
      console.error('Error Register:', error);
      if (error.message?.includes('already registered')) {
        Alert.alert('Error', 'Este correo electrónico ya está registrado.');
      } else {
        Alert.alert('Error', error.message || 'No pudimos crear tu cuenta. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} disabled={loading} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.secondary} />
            </TouchableOpacity>
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>Regístrate como Padre o Tutor</Text>
          </View>

          <View style={styles.form}>
            {/* NOMBRE */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={colors.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor={colors.tertiary}
                value={fullName}
                onChangeText={setFullName}
                editable={!loading}
                autoCapitalize="words"
              />
            </View>

            {/* CORREO */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                placeholderTextColor={colors.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            {/* FECHA DE NACIMIENTO */}
            <View style={styles.inputContainer}>
              <Ionicons name="calendar-outline" size={20} color={colors.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Fecha de nacimiento (AAAA-MM-DD)"
                placeholderTextColor={colors.tertiary}
                value={birthDate}
                onChangeText={setBirthDate}
                editable={!loading}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            {/* SELECCIÓN DE SEXO */}
            <View style={styles.row}>
              <TouchableOpacity 
                style={[styles.genderButton, gender === 'M' && styles.genderActive]} 
                onPress={() => { setGender('M'); setIsPregnant(false); }}
                disabled={loading}
              >
                <Ionicons name="male" size={16} color={gender === 'M' ? colors.background : colors.tertiary} />
                <Text style={[styles.genderText, gender === 'M' && styles.genderTextActive]}>Masculino</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.genderButton, gender === 'F' && styles.genderActive]} 
                onPress={() => setGender('F')}
                disabled={loading}
              >
                <Ionicons name="female" size={16} color={gender === 'F' ? colors.background : colors.tertiary} />
                <Text style={[styles.genderText, gender === 'F' && styles.genderTextActive]}>Femenino</Text>
              </TouchableOpacity>
            </View>

            {/* CONDICIONAL: EMBARAZO (Solo si es mujer) */}
            {gender === 'F' && (
              <View style={styles.switchContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="heart-outline" size={20} color="#ec4899" style={{ marginRight: 8 }} />
                  <Text style={styles.switchLabel}>¿Estás embarazada actualmente?</Text>
                </View>
                <Switch
                  value={isPregnant}
                  onValueChange={setIsPregnant}
                  trackColor={{ false: '#E5E7EB', true: '#fbcfe8' }}
                  thumbColor={isPregnant ? '#ec4899' : '#f4f3f4'}
                  disabled={loading}
                />
              </View>
            )}

            {/* CONTRASEÑA */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor={colors.tertiary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={colors.tertiary} />
              </TouchableOpacity>
            </View>

            {/* CONFIRMAR CONTRASEÑA */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirmar contraseña"
                placeholderTextColor={colors.tertiary}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} disabled={loading}>
                <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={20} color={colors.tertiary} />
              </TouchableOpacity>
            </View>

            {/* BOTÓN REGISTRAR */}
            <TouchableOpacity 
              style={[styles.registerButton, loading && { opacity: 0.7 }]} 
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.registerButtonText}>Crear mi cuenta</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} disabled={loading} onPress={() => router.back()}>
              <Text style={styles.linkText}>¿Ya tienes cuenta? <Text style={styles.linkTextBold}>Inicia sesión</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  header: { marginBottom: 32, marginTop: Platform.OS === 'android' ? 20 : 0 },
  backButton: { marginBottom: 16, alignSelf: 'flex-start', padding: 4 },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.secondary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.tertiary },
  form: { gap: 14 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: colors.secondary, fontSize: 16 },
  
  // Estilos para los selectores de sexo
  row: { flexDirection: 'row', gap: 12 },
  genderButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E5E7EB' },
  genderActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderText: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: colors.tertiary },
  genderTextActive: { color: colors.background },
  
  // Estilo para el switch de embarazo
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fdf2f8', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#fbcfe8' },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#be185d' },

  registerButton: { backgroundColor: colors.secondary, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  registerButtonText: { color: colors.background, fontSize: 16, fontWeight: 'bold' },
  linkButton: { alignItems: 'center', marginTop: 16 },
  linkText: { color: colors.tertiary, fontSize: 14 },
  linkTextBold: { color: colors.primary, fontWeight: 'bold' },
});