// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, SafeAreaView, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { supabase } from '../../lib/supabase';

type Role = 'parent' | 'health_center';

export const LoginScreen = () => {
  const router = useRouter();
  const [role, setRole] = useState<Role>('parent');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Estado para manejar la animación de carga
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos vacíos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      // 1. Autenticación oficial con Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Traer el rol del usuario desde tu tabla pública
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id_usuario', authData.user.id)
          .single();

        if (userError) throw userError;

        // 3. Validar Seguridad: ¿El tipo de cuenta seleccionado coincide con la BD?
        const isParentInDB = userData.rol === 'Tutor_PersonaNormal';
        const isParentSelected = role === 'parent';

        if (isParentInDB !== isParentSelected) {
          // Si un padre intenta entrar como clínica (o viceversa), lo bloqueamos y deslogueamos
          await supabase.auth.signOut();
          Alert.alert(
            'Acceso denegado', 
            isParentSelected 
              ? 'Esta cuenta pertenece a un profesional de salud. Cambia el tipo de cuenta arriba.' 
              : 'Esta cuenta pertenece a un padre/tutor. Cambia el tipo de cuenta arriba.'
          );
          return;
        }

        // 4. Éxito: Redirigimos al Dashboard correspondiente
        // Aquí podrías enviar a diferentes rutas según el rol si lo necesitas
        router.replace('/home');
      }
    } catch (error: any) {
      console.error('Error Login:', error);
      Alert.alert('Credenciales incorrectas', 'El correo o la contraseña no son válidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Bienvenido a BioSafe</Text>
          <Text style={styles.subtitle}>Selecciona tu tipo de cuenta para ingresar</Text>
        </View>

        {/* Selector de Rol */}
        <View style={styles.roleSelector}>
          <TouchableOpacity 
            style={[styles.roleButton, role === 'parent' && styles.roleButtonActive]}
            onPress={() => setRole('parent')}
            disabled={loading}
          >
            <Ionicons 
              name="people" 
              size={24} 
              color={role === 'parent' ? colors.background : colors.tertiary} 
            />
            <Text style={[styles.roleText, role === 'parent' && styles.roleTextActive]}>
              Padre / Tutor
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.roleButton, role === 'health_center' && styles.roleButtonActive]}
            onPress={() => setRole('health_center')}
            disabled={loading}
          >
            <Ionicons 
              name="medical" 
              size={24} 
              color={role === 'health_center' ? colors.background : colors.tertiary} 
            />
            <Text style={[styles.roleText, role === 'health_center' && styles.roleTextActive]}>
              Centro de Salud
            </Text>
          </TouchableOpacity>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
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

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={colors.tertiary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, loading && { opacity: 0.7 }]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton} 
            disabled={loading}
            onPress={() => router.push('/register')}
          >
            <Text style={styles.linkText}>¿No tienes cuenta? <Text style={styles.linkTextBold}>Regístrate</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.secondary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.tertiary },
  roleSelector: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16, padding: 4, marginBottom: 32 },
  roleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
  roleButtonActive: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  roleText: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: colors.tertiary },
  roleTextActive: { color: colors.background },
  form: { gap: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: colors.secondary, fontSize: 16 },
  loginButton: { backgroundColor: colors.secondary, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  loginButtonText: { color: colors.background, fontSize: 16, fontWeight: 'bold' },
  linkButton: { alignItems: 'center', marginTop: 24 },
  linkText: { color: colors.tertiary, fontSize: 14 },
  linkTextBold: { color: colors.primary, fontWeight: 'bold' },
});