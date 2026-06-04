import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { QRPayload } from '../../types';

export const QRScannerScreen = () => {
  const router = useRouter();
  const segments = useSegments();
  const tabGroup = segments[0] === '(adminTabs)' ? '(adminTabs)' : '(healthTabs)';
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const cooldown = useRef(false);

  useEffect(() => {
    setScanning(true);
    cooldown.current = false;
  }, []);

  const handleScan = async ({ data }: { data: string }) => {
    if (!scanning || cooldown.current || processing) return;
    cooldown.current = true;
    setScanning(false);
    setProcessing(true);

    try {
      let payload: QRPayload;
      try {
        payload = JSON.parse(data);
      } catch {
        Alert.alert('QR no válido', 'Este código no pertenece a un carnet BioSafe.', [
          { text: 'Reintentar', onPress: resetScanner },
        ]);
        return;
      }

      if (!payload.id_paciente || !payload.token) {
        Alert.alert('QR no válido', 'El código QR no tiene el formato correcto.', [
          { text: 'Reintentar', onPress: resetScanner },
        ]);
        return;
      }

      const { data: paciente, error } = await supabase
        .from('pacientes')
        .select('id_paciente, nombre_completo, codigo_qr_token')
        .eq('id_paciente', payload.id_paciente)
        .eq('codigo_qr_token', payload.token)
        .single();

      if (error || !paciente) {
        Alert.alert('Paciente no encontrado', 'No se encontró un paciente con este código QR.', [
          { text: 'Reintentar', onPress: resetScanner },
        ]);
        return;
      }

      router.push({
        pathname: `/(${tabGroup})/patient-detail` as any,
        params: { id_paciente: paciente.id_paciente },
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Ocurrió un error al consultar el paciente.', [
        { text: 'Reintentar', onPress: resetScanner },
      ]);
    } finally {
      setProcessing(false);
    }
  };

  const resetScanner = () => {
    cooldown.current = false;
    setScanning(true);
    setProcessing(false);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="camera-outline" size={48} color="#8e8e99" />
        <Text style={styles.permText}>Verificando permisos de cámara...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="camera-off-outline" size={48} color="#8e8e99" />
        <Text style={styles.permTitle}>Permiso de cámara requerido</Text>
        <Text style={styles.permText}>BioSafe necesita la cámara para escanear el QR del paciente.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Conceder permiso</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanning ? handleScan : undefined}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      {/* Overlay oscuro */}
      <View style={styles.overlay}>
        {/* Top */}
        <View style={styles.overlaySection} />

        {/* Middle row */}
        <View style={styles.middleRow}>
          <View style={styles.overlaySection} />
          {/* Ventana de escaneo */}
          <View style={styles.scanWindow}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            {processing && (
              <View style={styles.processingOverlay}>
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              </View>
            )}
          </View>
          <View style={styles.overlaySection} />
        </View>

        {/* Bottom */}
        <View style={[styles.overlaySection, styles.bottomSection]}>
          <Text style={styles.scanHint}>Apunta la cámara al código QR del carnet</Text>
          {!scanning && !processing && (
            <TouchableOpacity style={styles.retryBtn} onPress={resetScanner}>
              <Ionicons name="refresh" size={18} color="white" />
              <Text style={styles.retryText}>Escanear de nuevo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const WINDOW = 240;
const CORNER = 22;
const BORDER = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F8F9FA' },
  permTitle: { fontSize: 18, fontWeight: 'bold', color: '#553b5e', marginTop: 16, textAlign: 'center' },
  permText: { fontSize: 14, color: '#8e8e99', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  permBtn: { marginTop: 24, backgroundColor: '#a281ba', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  permBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  overlay: { flex: 1 },
  overlaySection: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  middleRow: { flexDirection: 'row', height: WINDOW },
  scanWindow: {
    width: WINDOW,
    height: WINDOW,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  tl: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderColor: '#a281ba', borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER, borderColor: '#a281ba', borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER, borderColor: '#a281ba', borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderColor: '#a281ba', borderBottomRightRadius: 8 },
  bottomSection: { justifyContent: 'center', alignItems: 'center', paddingBottom: 40, gap: 16 },
  scanHint: { color: 'rgba(255,255,255,0.85)', fontSize: 15, textAlign: 'center', paddingHorizontal: 40 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 22, paddingVertical: 12, borderRadius: 20,
  },
  retryText: { color: 'white', fontWeight: '600', fontSize: 14 },
});
