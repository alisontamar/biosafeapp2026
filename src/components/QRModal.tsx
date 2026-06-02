import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../theme/colors';

interface QRModalProps {
  visible: boolean;
  onClose: () => void;
  paciente: {
    id_paciente: string;
    nombre_completo: string;
    codigo_qr_token: string;
  } | null;
}

export const QRModal = ({ visible, onClose, paciente }: QRModalProps) => {
  if (!paciente) return null;

  const qrValue = JSON.stringify({
    id_paciente: paciente.id_paciente,
    token: paciente.codigo_qr_token,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.secondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Código de Identidad</Text>
          <Text style={styles.subtitle}>Muestra este código al personal médico para acceder al expediente rápidamente.</Text>

          <View style={styles.qrContainer}>
            <QRCode
              value={qrValue}
              size={220}
              backgroundColor="white"
              color={colors.secondary}
            />
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{paciente.nombre_completo}</Text>
            <Text style={styles.userId}>ID: {paciente.id_paciente.slice(0, 8)}...</Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.background },
  header: { padding: 24, alignItems: 'flex-end' },
  closeButton: { backgroundColor: colors.surface, padding: 8, borderRadius: 20 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.secondary, marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.tertiary, textAlign: 'center', marginBottom: 48, lineHeight: 24 },
  qrContainer: { padding: 24, backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: colors.secondary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, marginBottom: 40 },
  userInfo: { alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  userName: { fontSize: 20, fontWeight: 'bold', color: colors.secondary, marginBottom: 4 },
  userId: { fontSize: 16, color: colors.tertiary },
});
