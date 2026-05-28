// src/components/Header.tsx

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface HeaderProps {
  userName: string;
}

export const Header = ({ userName }: HeaderProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.greeting}>Hola,</Text>
        <Text style={styles.name}>{userName}</Text>
      </View>
      <TouchableOpacity style={styles.profileButton}>
        {/* Placeholder para la foto de perfil */}
        <View style={styles.avatarFallback}>
          <Ionicons name="person" size={24} color={colors.background} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10, backgroundColor: colors.background },
  textContainer: { flex: 1 },
  greeting: { fontSize: 16, color: colors.tertiary },
  name: { fontSize: 24, fontWeight: 'bold', color: colors.secondary },
  profileButton: { shadowColor: colors.secondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.tertiary, justifyContent: 'center', alignItems: 'center' },
});