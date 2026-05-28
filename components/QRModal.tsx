import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { X, Shield } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  childName?: string;
  ci?: string;
}

function QRPattern() {
  const size = width - 120;
  return (
    <View style={[styles.qrContainer, { width: size, height: size }]}>
      <View style={styles.qrInner}>
        {/* Simulated QR pattern */}
        <View style={styles.qrGrid}>
          {Array.from({ length: 7 }).map((_, row) =>
            Array.from({ length: 7 }).map((_, col) => {
              const isCorner = (row < 2 && col < 2) || (row < 2 && col > 4) || (row > 4 && col < 2);
              const isCenter = row === 3 && col === 3;
              const isDark = isCorner || isCenter || ((row + col) % 3 === 0 && !isCorner);
              return (
                <View
                  key={`${row}-${col}`}
                  style={[
                    styles.qrCell,
                    isDark ? styles.qrCellDark : styles.qrCellLight,
                    isCorner && styles.qrCellCorner,
                  ]}
                />
              );
            })
          )}
        </View>
        <View style={styles.qrLogoOverlay}>
          <View style={styles.qrLogo}>
            <Shield color={Colors.primary} size={20} strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </View>
  );
}

export default function QRModal({ visible, onClose, childName = 'Sofia Martinez', ci = '9876543-2' }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.sheetHeader}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X color={Colors.white} size={22} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Identidad Digital</Text>
            <View style={styles.verifiedBadge}>
              <Shield color={Colors.white} size={14} strokeWidth={2} />
              <Text style={styles.verifiedText}>BioSafe Verified</Text>
            </View>
          </LinearGradient>

          <View style={styles.qrSection}>
            <View style={styles.qrWrapper}>
              <QRPattern />
            </View>
            <Text style={styles.childName}>{childName}</Text>
            <Text style={styles.childCI}>CI: {ci}</Text>
          </View>

          <View style={styles.instruction}>
            <Text style={styles.instructionText}>
              Muestra este código al personal médico para validar el historial de vacunación
            </Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerDot} />
            <Text style={styles.footerText}>Código actualizado hace 2 minutos</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  sheetHeader: { padding: 24, alignItems: 'center', gap: 8 },
  closeBtn: { position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  verifiedText: { fontSize: 12, color: Colors.white, fontWeight: '600' },
  qrSection: { alignItems: 'center', paddingVertical: 32 },
  qrWrapper: { padding: 16, backgroundColor: Colors.white, borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  qrContainer: { backgroundColor: Colors.white, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qrInner: { width: '100%', height: '100%', padding: 8, position: 'relative' },
  qrGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  qrCell: { width: '14.28%', aspectRatio: 1, padding: 1 },
  qrCellDark: { backgroundColor: Colors.textPrimary, borderRadius: 2 },
  qrCellLight: { backgroundColor: 'transparent' },
  qrCellCorner: { backgroundColor: Colors.primary },
  qrLogoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  qrLogo: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border },
  childName: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 20 },
  childCI: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, fontWeight: '500' },
  instruction: { marginHorizontal: 32, padding: 16, backgroundColor: Colors.primarySurface, borderRadius: 16, marginBottom: 16 },
  instructionText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 32 },
  footerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  footerText: { fontSize: 12, color: Colors.textMuted },
});
