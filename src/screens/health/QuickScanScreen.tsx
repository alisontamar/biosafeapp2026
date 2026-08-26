import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { pacientesVacunacionService } from '../../services/pacientesVacunacion.service';
import { ServiceError } from '../../services/_client';

const PRIMARY = '#a281ba';

type ScanState = 'scanning' | 'processing' | 'success' | 'error';

export const QuickScanScreen = () => {
  const { id_vacuna, nombre_vacuna, dosis_numero } = useLocalSearchParams<{
    id_vacuna: string;
    nombre_vacuna: string;
    dosis_numero: string;
  }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>('scanning');
  const [ultimoPaciente, setUltimoPaciente] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [dosisHoy, setDosisHoy] = useState(0);
  const cooldown = useRef(false);

  const resetScanner = () => {
    cooldown.current = false;
    setState('scanning');
    setErrorMsg('');
  };

  const handleScan = async ({ data }: { data: string }) => {
    if (state !== 'scanning' || cooldown.current) return;
    cooldown.current = true;
    setState('processing');

    try {
      let payload: { id_paciente: string; token: string };
      try {
        payload = JSON.parse(data);
      } catch {
        setErrorMsg('Este código QR no pertenece a un carnet BioSafe.');
        setState('error');
        return;
      }

      if (!payload.id_paciente || !payload.token) {
        setErrorMsg('Formato de QR inválido.');
        setState('error');
        return;
      }

      // Verificar paciente
      let paciente: { id_paciente: string; nombre_completo: string };
      try {
        paciente = await pacientesVacunacionService.obtenerPacientePorQR({
          id_paciente: payload.id_paciente,
          token: payload.token,
        });
      } catch {
        setErrorMsg('Paciente no encontrado. Verifica el QR.');
        setState('error');
        return;
      }

      // Registrar dosis directamente
      try {
        await pacientesVacunacionService.registrarDosis({
          id_paciente: paciente.id_paciente,
          id_vacuna,
          fecha_aplicacion: new Date().toISOString(),
        });
      } catch (dErr) {
        if (dErr instanceof ServiceError && dErr.code === 'duplicate_dose') {
          setErrorMsg(`${paciente.nombre_completo} ya tiene esta dosis registrada.`);
        } else {
          setErrorMsg(dErr instanceof Error ? dErr.message : 'Error al registrar la dosis.');
        }
        setState('error');
        return;
      }

      setUltimoPaciente(paciente.nombre_completo);
      setDosisHoy((prev) => prev + 1);
      setState('success');
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Error inesperado.');
      setState('error');
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="camera-off-outline" size={48} color="#8e8e99" />
        <Text style={styles.permTitle}>Permiso de cámara requerido</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Conceder permiso</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera */}
      {(state === 'scanning' || state === 'processing') && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={state === 'scanning' ? handleScan : undefined}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
      )}

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Vacuna banner */}
        <View style={styles.topBanner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <View style={styles.vacunaBanner}>
            <Ionicons name="medical" size={16} color="white" />
            <View>
              <Text style={styles.vacunaBannerNombre}>{nombre_vacuna}</Text>
              <Text style={styles.vacunaBannerDosis}>{dosis_numero}</Text>
            </View>
          </View>
          {dosisHoy > 0 && (
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>{dosisHoy}</Text>
            </View>
          )}
        </View>

        {/* Estados */}
        {state === 'scanning' && (
          <>
            <View style={styles.middleRow}>
              <View style={styles.overlaySection} />
              <View style={styles.scanWindow}>
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
              </View>
              <View style={styles.overlaySection} />
            </View>
            <View style={[styles.overlaySection, styles.bottomHint]}>
              <Text style={styles.hintText}>Apunta al QR del carnet del paciente</Text>
            </View>
          </>
        )}

        {state === 'processing' && (
          <View style={styles.stateScreen}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.stateTitle}>Registrando dosis...</Text>
          </View>
        )}

        {state === 'success' && (
          <View style={styles.stateScreen}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={72} color="#10B981" />
            </View>
            <Text style={styles.stateTitle}>¡Dosis registrada!</Text>
            <Text style={styles.stateSubtitle}>{ultimoPaciente}</Text>
            <View style={styles.vacunaBannerInline}>
              <Ionicons name="medical" size={14} color={PRIMARY} />
              <Text style={styles.vacunaBannerInlineText}>{nombre_vacuna} · {dosis_numero}</Text>
            </View>
            <View style={styles.successBtns}>
              <TouchableOpacity style={styles.nextBtn} onPress={resetScanner}>
                <Ionicons name="qr-code-outline" size={18} color="white" />
                <Text style={styles.nextBtnText}>Siguiente paciente</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.finishBtn} onPress={() => router.back()}>
                <Text style={styles.finishBtnText}>Finalizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {state === 'error' && (
          <View style={styles.stateScreen}>
            <View style={styles.errorIcon}>
              <Ionicons name="close-circle" size={72} color="#EF4444" />
            </View>
            <Text style={styles.stateTitle}>No se pudo registrar</Text>
            <Text style={styles.stateSubtitle}>{errorMsg}</Text>
            <TouchableOpacity style={styles.nextBtn} onPress={resetScanner}>
              <Ionicons name="refresh" size={18} color="white" />
              <Text style={styles.nextBtnText}>Intentar de nuevo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const WINDOW = 240;
const CORNER = 22;
const BORDER = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  permTitle: { fontSize: 17, fontWeight: 'bold', color: '#553b5e', marginTop: 16 },
  permBtn: { marginTop: 20, backgroundColor: PRIMARY, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  permBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  overlay: { flex: 1 },

  topBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  vacunaBanner: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(162,129,186,0.35)',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
  },
  vacunaBannerNombre: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  vacunaBannerDosis: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 },
  counterBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center',
  },
  counterText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  overlaySection: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  middleRow: { flexDirection: 'row', height: WINDOW },
  scanWindow: { width: WINDOW, height: WINDOW, backgroundColor: 'transparent', position: 'relative' },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  tl: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderColor: PRIMARY, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: BORDER, borderRightWidth: BORDER, borderColor: PRIMARY, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: BORDER, borderLeftWidth: BORDER, borderColor: PRIMARY, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER, borderColor: PRIMARY, borderBottomRightRadius: 8 },
  bottomHint: { justifyContent: 'center', alignItems: 'center', paddingBottom: 40 },
  hintText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },

  stateScreen: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 12,
  },
  successIcon: { marginBottom: 8 },
  errorIcon: { marginBottom: 8 },
  stateTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  stateSubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 16, textAlign: 'center' },
  vacunaBannerInline: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(162,129,186,0.25)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    marginBottom: 8,
  },
  vacunaBannerInlineText: { color: PRIMARY, fontWeight: '700', fontSize: 13 },
  successBtns: { width: '100%', gap: 10, marginTop: 8 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: PRIMARY, borderRadius: 16, paddingVertical: 16,
  },
  nextBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  finishBtn: {
    alignItems: 'center', paddingVertical: 14,
    borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  finishBtnText: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 15 },
});
