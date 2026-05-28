// src/screens/qr/QRScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export const QRScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Código de Identidad</Text>
        <Text style={styles.subtitle}>Muestra este código al personal médico para acceder al expediente rápidamente.</Text>

        <View style={styles.qrContainer}>
          {/* Aquí integrarás react-native-qrcode-svg */}
          <Ionicons name="qr-code" size={200} color={colors.secondary} />
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>Familia Gomez</Text>
          <Text style={styles.userId}>Titular CI: 87654321</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 24, alignItems: 'flex-end' },
  closeButton: { backgroundColor: colors.surface, padding: 8, borderRadius: 20 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.secondary, marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.tertiary, textAlign: 'center', marginBottom: 48, lineHeight: 24 },
  qrContainer: { padding: 32, backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: colors.secondary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, marginBottom: 40 },
  userInfo: { alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  userName: { fontSize: 20, fontWeight: 'bold', color: colors.secondary, marginBottom: 4 },
  userId: { fontSize: 16, color: colors.tertiary },
});