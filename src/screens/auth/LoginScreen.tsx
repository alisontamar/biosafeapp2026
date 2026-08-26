import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { usuariosService } from '../../services/usuarios.service';
import { ROLES_SALUD, RolUsuario } from '../../types';

type LoginMode = 'parent' | 'health' | 'admin';

const ROLE_CONFIG: Record<LoginMode, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  parent: { icon: 'people', label: 'Padre / Tutor' },
  health: { icon: 'medical', label: 'Centro de Salud' },
  admin: { icon: 'shield-checkmark', label: 'Administración' },
};

function modeFromRole(rol: RolUsuario): LoginMode {
  if (rol === 'Tutor_PersonaNormal') return 'parent';
  if (ROLES_SALUD.includes(rol)) return 'health';
  return 'admin';
}

function routeFromRole(rol: RolUsuario): string {
  if (rol === 'Tutor_PersonaNormal') return '/(tabs)/home';
  if (ROLES_SALUD.includes(rol)) return '/(healthTabs)/dashboard';
  return '/(adminTabs)/dashboard';
}

export const LoginScreen = () => {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('parent');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos vacíos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) throw authError;

      if (authData.user) {
        const perfil = await usuariosService.obtenerPerfil();
        const rol = perfil.rol as RolUsuario;
        const expectedMode = modeFromRole(rol);

        if (expectedMode !== mode) {
          await supabase.auth.signOut();
          Alert.alert(
            'Tipo de cuenta incorrecto',
            `Esta cuenta es de tipo "${ROLE_CONFIG[expectedMode].label}". Selecciona el tipo correcto arriba.`
          );
          return;
        }

        router.replace(routeFromRole(rol) as any);
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Bienvenido a BioSafe</Text>
            <Text style={styles.subtitle}>Selecciona tu tipo de cuenta para ingresar</Text>
          </View>

          {/* Selector de Rol */}
          <View style={styles.roleSelector}>
            {(Object.entries(ROLE_CONFIG) as [LoginMode, typeof ROLE_CONFIG[LoginMode]][]).map(([key, cfg]) => (
              <TouchableOpacity
                key={key}
                style={[styles.roleButton, mode === key && styles.roleButtonActive]}
                onPress={() => setMode(key)}
                disabled={loading}
              >
                <Ionicons name={cfg.icon} size={20} color={mode === key ? colors.background : colors.tertiary} />
                <Text style={[styles.roleText, mode === key && styles.roleTextActive]}>{cfg.label}</Text>
              </TouchableOpacity>
            ))}
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

            {mode === 'parent' && (
              <TouchableOpacity style={styles.linkButton} disabled={loading} onPress={() => router.push('/register')}>
                <Text style={styles.linkText}>
                  ¿No tienes cuenta? <Text style={styles.linkTextBold}>Regístrate</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, padding: 24 },
  header: { marginTop: 40, marginBottom: 32 },
  title: { fontSize: 32, fontWeight: 'bold', color: colors.secondary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.tertiary },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 4,
    marginBottom: 32,
    gap: 4,
  },
  roleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  roleText: { fontSize: 11, fontWeight: '600', color: colors.tertiary, textAlign: 'center' },
  roleTextActive: { color: colors.background },
  form: { gap: 16 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: colors.secondary, fontSize: 16 },
  loginButton: {
    backgroundColor: colors.secondary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginButtonText: { color: colors.background, fontSize: 16, fontWeight: 'bold' },
  linkButton: { alignItems: 'center', marginTop: 24 },
  linkText: { color: colors.tertiary, fontSize: 14 },
  linkTextBold: { color: colors.primary, fontWeight: 'bold' },
});
