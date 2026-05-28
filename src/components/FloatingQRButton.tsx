// src/components/FloatingQRButton.tsx

import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
// Asumiendo que usas Expo o react-native-vector-icons
import { Ionicons } from '@expo/vector-icons'; 
import { colors } from '../theme/colors';

interface FloatingQRButtonProps {
  onPress: () => void;
}

export const FloatingQRButton = ({ onPress }: FloatingQRButtonProps) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity 
        style={styles.button} 
        onPress={onPress} 
        activeOpacity={0.8}
      >
        <Ionicons name="qr-code-outline" size={32} color={colors.background} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    // Ajusta este valor dependiendo de la altura de tu TabBar
    bottom: 30, 
    alignSelf: 'center',
    zIndex: 10,
  },
  button: {
    backgroundColor: colors.primary,
    width: 64,
    height: 64,
    borderRadius: 32, // Perfectamente redondo
    justifyContent: 'center',
    alignItems: 'center',
    // Sombra para iOS
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    // Sombra para Android
    elevation: 6, 
  },
});