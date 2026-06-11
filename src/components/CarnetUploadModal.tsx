import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  SafeAreaView, ActivityIndicator, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';

const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
const SUPA_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPA_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

type Fase = 'fuente' | 'procesando' | 'revision' | 'guardando';

type DosisExtraida = {
  key: string;
  vacunaNombre: string;
  id_vacuna: string | null;
  catalogoLabel: string;
  fecha: string;
  lote: string;
  pickerOpen: boolean;
};

type CatItem = { id_vacuna: string; nombre_enfermedad: string; dosis_numero: string };

interface Props {
  visible: boolean;
  onClose: () => void;
  idPaciente: string;
  nombrePaciente: string;
  onUploadComplete?: () => void;
}

export const CarnetUploadModal = ({
  visible, onClose, idPaciente, nombrePaciente, onUploadComplete,
}: Props) => {
  const [fase, setFase] = useState<Fase>('fuente');
  const [dosis, setDosis] = useState<DosisExtraida[]>([]);
  const [catalogo, setCatalogo] = useState<CatItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setFase('fuente');
      setDosis([]);
      setErrorMsg(null);
      cargarCatalogo();
    }
  }, [visible]);

  const cargarCatalogo = async () => {
    const { data } = await supabase
      .from('cat_vacunas_oficiales')
      .select('id_vacuna, nombre_enfermedad, dosis_numero')
      .order('nombre_enfermedad');
    setCatalogo(data ?? []);
  };

  const matchCatalogo = (nombre: string): CatItem | null => {
    if (!nombre) return null;
    const n = nombre.toLowerCase().trim();
    let found = catalogo.find((c) => c.nombre_enfermedad.toLowerCase() === n);
    if (found) return found;
    found = catalogo.find((c) => {
      const cn = c.nombre_enfermedad.toLowerCase();
      const firstWord = cn.split(' ')[0];
      return cn.includes(n) || n.includes(cn) || (firstWord.length > 3 && n.includes(firstWord));
    });
    return found ?? null;
  };

  const normalizarFecha = (raw: string | null): string => {
    if (!raw) return '';
    const s = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split('/');
      return `${y}-${m}-${d}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      const [d, m, y] = s.split('-');
      return `${y}-${m}-${d}`;
    }
    return s;
  };

  const procesarExtraccion = (aiDosis: { vacuna: string; fecha?: string | null; lote?: string | null }[]) => {
    if (aiDosis.length === 0) {
      setErrorMsg('No se encontraron vacunas. Intentá con una foto más clara o mejor iluminada.');
      setFase('fuente');
      return;
    }
    const extraidas: DosisExtraida[] = aiDosis.map((d, i) => {
      const match = matchCatalogo(d.vacuna ?? '');
      return {
        key: `${i}-${Date.now()}`,
        vacunaNombre: d.vacuna ?? '',
        id_vacuna: match?.id_vacuna ?? null,
        catalogoLabel: match
          ? `${match.nombre_enfermedad} — ${match.dosis_numero}`
          : 'Seleccionar vacuna...',
        fecha: normalizarFecha(d.fecha ?? null),
        lote: d.lote ?? '',
        pickerOpen: false,
      };
    });
    setDosis(extraidas);
    setFase('revision');
  };

  const analizarImagen = async (base64: string) => {
    setFase('procesando');
    setErrorMsg(null);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          response_format: { type: 'json_object' },
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
              {
                type: 'text',
                text: 'Eres un lector de carnets de vacunación bolivianos. Extrae TODAS las vacunas aplicadas visibles. Responde SOLO con JSON: {"dosis":[{"vacuna":"nombre en español","fecha":"DD/MM/YYYY","lote":"numero o null"}]}. Si un campo no es legible usa null.',
              },
            ],
          }],
        }),
      });
      if (!res.ok) throw new Error(`Error Groq: ${res.status}`);
      const data = await res.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
      procesarExtraccion(parsed.dosis ?? []);
    } catch (e: any) {
      setErrorMsg(e.message ?? 'No se pudo analizar la imagen.');
      setFase('fuente');
    }
  };

  const analizarPDF = async (base64: string) => {
    setFase('procesando');
    setErrorMsg(null);
    try {
      const res = await fetch(`${SUPA_URL}/functions/v1/extract-carnet`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPA_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ base64, type: 'pdf' }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      if (data.error === 'no_text') {
        setErrorMsg('El PDF no tiene texto legible (puede ser escaneado). Intentá tomar una foto del carnet.');
        setFase('fuente');
        return;
      }
      procesarExtraccion(data.dosis ?? []);
    } catch (e: any) {
      setErrorMsg(e.message ?? 'No se pudo procesar el PDF. Intentá con una foto.');
      setFase('fuente');
    }
  };

  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.65, base64: true });
    if (!result.canceled && result.assets[0]?.base64) await analizarImagen(result.assets[0].base64);
  };

  const elegirGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.65, base64: true });
    if (!result.canceled && result.assets[0]?.base64) await analizarImagen(result.assets[0].base64);
  };

  const elegirPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (!result.canceled && result.assets[0]) {
        const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await analizarPDF(base64);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo leer el PDF.');
    }
  };

  const updateDosis = (key: string, field: 'fecha' | 'lote', value: string) => {
    setDosis((prev) => prev.map((d) => d.key === key ? { ...d, [field]: value } : d));
  };

  const togglePicker = (key: string) => {
    setDosis((prev) => prev.map((d) => d.key === key
      ? { ...d, pickerOpen: !d.pickerOpen }
      : { ...d, pickerOpen: false }
    ));
  };

  const selectCatalogo = (key: string, item: CatItem) => {
    setDosis((prev) => prev.map((d) => d.key === key ? {
      ...d,
      id_vacuna: item.id_vacuna,
      catalogoLabel: `${item.nombre_enfermedad} — ${item.dosis_numero}`,
      pickerOpen: false,
    } : d));
  };

  const removeDosis = (key: string) => {
    setDosis((prev) => prev.filter((d) => d.key !== key));
  };

  const guardar = async () => {
    const validas = dosis.filter((d) => d.id_vacuna && d.fecha);
    if (validas.length === 0) {
      Alert.alert('Faltan datos', 'Seleccioná la vacuna y la fecha para al menos una dosis.');
      return;
    }
    setFase('guardando');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Deduplicar: si el usuario seleccionó la misma vacuna dos veces, tomar la primera
      const seen = new Set<string>();
      const rows = validas
        .filter((d) => { const ok = !seen.has(d.id_vacuna!); seen.add(d.id_vacuna!); return ok; })
        .map((d) => ({
          id_paciente: idPaciente,
          id_vacuna: d.id_vacuna,
          fecha_aplicacion: d.fecha,
          lote: d.lote || null,
          origen_registro: 'Migrado_Cartilla_Fisica',
          id_usuario_atendedor: session?.user?.id ?? null,
        }));

      const { error } = await supabase.from('dosis_aplicadas').upsert(rows, {
        onConflict: 'id_paciente,id_vacuna',
        ignoreDuplicates: true,
      });
      if (error) throw error;

      onUploadComplete?.();
      Alert.alert('¡Listo!', `Se guardaron ${rows.length} dosis del carnet.`, [{ text: 'OK', onPress: onClose }]);
    } catch (e: any) {
      Alert.alert('Error al guardar', e.message ?? 'Intentá nuevamente.');
      setFase('revision');
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Carnet de Vacunación</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{nombrePaciente}</Text>
          </View>
          {fase !== 'procesando' && fase !== 'guardando' && (
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#553b5e" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── FASE: selección de fuente ── */}
        {(fase === 'fuente') && (
          <ScrollView contentContainerStyle={styles.centeredContent}>
            <View style={styles.iaIconWrap}>
              <Ionicons name="scan-outline" size={48} color="#a281ba" />
            </View>
            <Text style={styles.fuenteTitle}>Escanear carnet con IA</Text>
            <Text style={styles.fuenteDesc}>
              La IA leerá el carnet y extraerá las vacunas automáticamente. Revisa y confirma antes de guardar.
            </Text>

            {errorMsg && (
              <View style={styles.errorBanner}>
                <Ionicons name="warning-outline" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <View style={styles.opcionesCol}>
              <TouchableOpacity style={styles.opcionBtn} onPress={tomarFoto}>
                <View style={[styles.opcionIconWrap, { backgroundColor: 'rgba(162,129,186,0.1)' }]}>
                  <Ionicons name="camera" size={26} color="#a281ba" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.opcionLabel}>Tomar foto</Text>
                  <Text style={styles.opcionHint}>Fotografía el carnet con la cámara</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.opcionBtn} onPress={elegirGaleria}>
                <View style={[styles.opcionIconWrap, { backgroundColor: 'rgba(99,179,237,0.1)' }]}>
                  <Ionicons name="images" size={26} color="#4299E1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.opcionLabel}>Galería</Text>
                  <Text style={styles.opcionHint}>Selecciona una foto existente</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.opcionBtn} onPress={elegirPDF}>
                <View style={[styles.opcionIconWrap, { backgroundColor: 'rgba(239,68,68,0.08)' }]}>
                  <Ionicons name="document-text" size={26} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.opcionLabel}>PDF digital</Text>
                  <Text style={styles.opcionHint}>Para carnets en formato PDF de texto</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* ── FASE: procesando ── */}
        {fase === 'procesando' && (
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color="#a281ba" />
            <Text style={styles.procesandoTitle}>Analizando carnet con IA...</Text>
            <Text style={styles.procesandoDesc}>Esto puede tardar unos segundos</Text>
          </View>
        )}

        {/* ── FASE: revisión ── */}
        {fase === 'revision' && (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.revisionHeader}>
              <Text style={styles.revisionTitle}>Revisar dosis extraídas</Text>
              <Text style={styles.revisionSub}>
                {dosis.length} vacuna{dosis.length !== 1 ? 's' : ''} encontrada{dosis.length !== 1 ? 's' : ''} · Edita si algo no está correcto
              </Text>
            </View>
            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
              keyboardShouldPersistTaps="handled"
            >
              {dosis.map((d, idx) => (
                <View key={d.key} style={styles.dosisCard}>
                  {/* Cabecera de la dosis */}
                  <View style={styles.dosisCardHeader}>
                    <View style={styles.dosisNumBadge}>
                      <Text style={styles.dosisNumText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.dosisNombreIA} numberOfLines={1}>
                      IA detectó: "{d.vacunaNombre}"
                    </Text>
                    <TouchableOpacity onPress={() => removeDosis(d.key)} style={styles.removeBtn}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Selector de vacuna del catálogo */}
                  <Text style={styles.fieldLabel}>Vacuna (catálogo oficial)</Text>
                  <TouchableOpacity
                    style={[styles.pickerBtn, !d.id_vacuna && styles.pickerBtnEmpty]}
                    onPress={() => togglePicker(d.key)}
                  >
                    <Text style={[styles.pickerBtnText, !d.id_vacuna && styles.pickerBtnTextEmpty]}
                      numberOfLines={1}>
                      {d.catalogoLabel}
                    </Text>
                    <Ionicons
                      name={d.pickerOpen ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#8e8e99"
                    />
                  </TouchableOpacity>

                  {d.pickerOpen && (
                    <View style={styles.pickerDropdown}>
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {catalogo.map((cat) => (
                          <TouchableOpacity
                            key={cat.id_vacuna}
                            style={[
                              styles.pickerItem,
                              d.id_vacuna === cat.id_vacuna && styles.pickerItemSelected,
                            ]}
                            onPress={() => selectCatalogo(d.key, cat)}
                          >
                            <Text style={[
                              styles.pickerItemText,
                              d.id_vacuna === cat.id_vacuna && styles.pickerItemTextSelected,
                            ]}>
                              {cat.nombre_enfermedad} — {cat.dosis_numero}
                            </Text>
                            {d.id_vacuna === cat.id_vacuna && (
                              <Ionicons name="checkmark" size={16} color="#a281ba" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Fecha y lote en fila */}
                  <View style={styles.fieldsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Fecha (AAAA-MM-DD)</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={d.fecha}
                        onChangeText={(v) => updateDosis(d.key, 'fecha', v)}
                        placeholder="2024-03-15"
                        placeholderTextColor="#C0C0C8"
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>Lote (opcional)</Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={d.lote}
                        onChangeText={(v) => updateDosis(d.key, 'lote', v)}
                        placeholder="ABC-123"
                        placeholderTextColor="#C0C0C8"
                      />
                    </View>
                  </View>
                </View>
              ))}

              {dosis.length === 0 && (
                <View style={styles.emptyRevision}>
                  <Text style={styles.emptyRevisionText}>
                    Eliminaste todas las dosis. Volvé atrás para intentar con otra foto.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Botones fijos abajo */}
            <View style={styles.revisionFooter}>
              <TouchableOpacity style={styles.btnSecundario} onPress={() => setFase('fuente')}>
                <Ionicons name="arrow-back-outline" size={18} color="#a281ba" />
                <Text style={styles.btnSecundarioText}>Volver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimario, dosis.length === 0 && styles.btnDisabled]}
                onPress={guardar}
                disabled={dosis.length === 0}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="white" />
                <Text style={styles.btnPrimarioText}>
                  Guardar {dosis.filter((d) => d.id_vacuna && d.fecha).length} dosis
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* ── FASE: guardando ── */}
        {fase === 'guardando' && (
          <View style={styles.centeredContent}>
            <ActivityIndicator size="large" color="#a281ba" />
            <Text style={styles.procesandoTitle}>Guardando dosis...</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#553b5e' },
  headerSub: { fontSize: 12, color: '#8e8e99', marginTop: 2 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },

  centeredContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  iaIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(162,129,186,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  fuenteTitle: { fontSize: 18, fontWeight: '700', color: '#553b5e', textAlign: 'center' },
  fuenteDesc: {
    fontSize: 13, color: '#8e8e99', textAlign: 'center',
    lineHeight: 20, marginTop: 8, marginBottom: 24,
  },
  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.07)', borderRadius: 10,
    padding: 12, marginBottom: 16, alignSelf: 'stretch',
  },
  errorText: { flex: 1, fontSize: 13, color: '#EF4444', lineHeight: 18 },

  opcionesCol: { alignSelf: 'stretch', gap: 10 },
  opcionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'white', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#E5E7EB',
  },
  opcionIconWrap: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
  },
  opcionLabel: { fontSize: 15, fontWeight: '700', color: '#553b5e' },
  opcionHint: { fontSize: 12, color: '#8e8e99', marginTop: 2 },

  procesandoTitle: { fontSize: 16, fontWeight: '600', color: '#553b5e', marginTop: 20 },
  procesandoDesc: { fontSize: 13, color: '#8e8e99', marginTop: 6 },

  revisionHeader: {
    backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  revisionTitle: { fontSize: 16, fontWeight: '700', color: '#553b5e' },
  revisionSub: { fontSize: 12, color: '#8e8e99', marginTop: 3 },

  dosisCard: {
    backgroundColor: 'white', borderRadius: 16,
    padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    gap: 10,
  },
  dosisCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dosisNumBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(162,129,186,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  dosisNumText: { fontSize: 12, fontWeight: '700', color: '#a281ba' },
  dosisNombreIA: { flex: 1, fontSize: 12, color: '#8e8e99', fontStyle: 'italic' },
  removeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(239,68,68,0.07)',
    justifyContent: 'center', alignItems: 'center',
  },

  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#8e8e99', textTransform: 'uppercase', letterSpacing: 0.4 },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8F9FA', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4,
  },
  pickerBtnEmpty: { borderColor: '#F59E0B', borderStyle: 'dashed' },
  pickerBtnText: { flex: 1, fontSize: 13, color: '#553b5e' },
  pickerBtnTextEmpty: { color: '#F59E0B' },

  pickerDropdown: {
    backgroundColor: 'white', borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  pickerItemSelected: { backgroundColor: 'rgba(162,129,186,0.08)' },
  pickerItemText: { fontSize: 13, color: '#553b5e', flex: 1 },
  pickerItemTextSelected: { color: '#a281ba', fontWeight: '600' },

  fieldsRow: { flexDirection: 'row', gap: 10 },
  fieldInput: {
    backgroundColor: '#F8F9FA', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    fontSize: 13, color: '#553b5e', marginTop: 4,
  },

  emptyRevision: { alignItems: 'center', paddingVertical: 40 },
  emptyRevisionText: { fontSize: 14, color: '#8e8e99', textAlign: 'center' },

  revisionFooter: {
    flexDirection: 'row', gap: 12, padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  btnSecundario: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#a281ba',
  },
  btnSecundarioText: { color: '#a281ba', fontWeight: '700', fontSize: 14 },
  btnPrimario: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#a281ba',
  },
  btnPrimarioText: { color: 'white', fontWeight: '700', fontSize: 14 },
  btnDisabled: { backgroundColor: '#D1D5DB' },
});
