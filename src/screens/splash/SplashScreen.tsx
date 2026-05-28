// src/screens/splash/SplashScreen.tsx

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';

export const SplashScreen = () => {
  const router = useRouter();

  useEffect(() => {
    // Aquí irá tu lógica real con Supabase
    // const { data: { session } } = await supabase.auth.getSession();
    
    const checkSession = async () => {
      // Simulamos 1.5 segundos de carga de recursos/sesión
      setTimeout(() => {
        // Si no hay sesión activa, lo mandamos al Onboarding
        // Si la hubiera, harías: router.replace('/home');
        router.replace('/onboarding');
      }, 1500);
    };

    checkSession();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Logo estático de carga */}
      <Ionicons name="medkit" size={100} color={colors.background} />
      <Text style={styles.title}>BioSafe</Text>
      
      <ActivityIndicator 
        size="large" 
        color={colors.background} 
        style={styles.loader} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.primary, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 40, 
    fontWeight: 'bold', 
    color: colors.background, 
    marginTop: 16,
    letterSpacing: 1 
  },
  loader: { 
    position: 'absolute', 
    bottom: 50 
  }
});