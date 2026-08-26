// src/screens/splash/SplashScreen.tsx

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useRootNavigationState } from 'expo-router';
import { colors } from '../../theme/colors';

export const SplashScreen = () => {
  const router = useRouter();
  const rootState = useRootNavigationState();

  useEffect(() => {
    if (!rootState?.key) return; // esperar a que el navigator esté listo

    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 1500);

    return () => clearTimeout(timer);
  }, [rootState?.key]);

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