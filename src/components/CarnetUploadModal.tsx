import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  SafeAreaView, Alert, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabase';

interface CarnetUploadModalProps {
  visible: boolean;
  onClose: () => void;
  idPaciente: string;
  nombrePaciente: string;
  onUploadComplete?: () => void;
}

interface Carnet {
  id: string;
  url: string;
  isPdf: boolean;
}

export const CarnetUploadModal = ({
  visible,
  onClose,
  idPaciente,
  nombrePaciente,
  onUploadComplete,
}: CarnetUploadModalProps) => {
  const [uploading, setUploading] = useState(false);
  const [carnets, setCarnets] = useState<Carnet[]>([]);
  const [loadingCarnets, setLoadingCarnets] = useState(false);

  useEffect(() => {
    if (visible && idPaciente) loadCarnets();
  }, [visible, idPaciente]);

  const loadCarnets = async () => {
    setLoadingCarnets(true);
    try {
      const { data } = await supabase
        .from('cartillas_fisicas_imagenes')
        .select('id_imagen, url_imagen_storage')
        .eq('id_paciente', idPaciente)
        .order('fecha_subida', { ascending: false });

      setCarnets(
        (data || []).map((d) => ({
          id: d.id_imagen,
          url: d.url_imagen_storage,
          isPdf: d.url_imagen_storage.toLowerCase().endsWith('.pdf'),
        }))
      );
    } catch {
      // silently ignore
    } finally {
      setLoadingCarnets(false);
    }
  };

  const pickImage = async (fromCamera: boolean) => {
    try {
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara para tomar la foto.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.75,
        });
        if (!result.canceled && result.assets[0]) {
          await uploadFile(result.assets[0].uri, 'image/jpeg', 'jpg');
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.75,
        });
        if (!result.canceled && result.assets[0]) {
          await uploadFile(result.assets[0].uri, 'image/jpeg', 'jpg');
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo acceder a la cámara.');
    }
  };

  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        await uploadFile(result.assets[0].uri, 'application/pdf', 'pdf');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo seleccionar el PDF.');
    }
  };

  const uploadFile = async (uri: string, mimeType: string, ext: string) => {
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = `${idPaciente}/${Date.now()}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from('cartillas-fisicas')
        .upload(fileName, blob, { contentType: mimeType });

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage
        .from('cartillas-fisicas')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('cartillas_fisicas_imagenes')
        .insert({ id_paciente: idPaciente, url_imagen_storage: urlData.publicUrl });

      if (dbError) throw dbError;

      await loadCarnets();
      onUploadComplete?.();
      Alert.alert('¡Guardado!', 'El carnet de vacunación fue subido exitosamente.');
    } catch (e: any) {
      Alert.alert('Error al subir', e.message || 'Intenta nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Carnet de Vacunación</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{nombrePaciente}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={uploading}>
            <Ionicons name="close" size={20} color={colors.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Upload section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Agregar carnet físico</Text>
            <Text style={styles.sectionDesc}>
              Toma una foto o sube el PDF del carnet de vacunación antiguo para guardar el historial completo.
            </Text>

            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[styles.optionCard, uploading && styles.disabled]}
                onPress={() => pickImage(true)}
                disabled={uploading}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: 'rgba(162,128,185,0.1)' }]}>
                  <Ionicons name="camera" size={28} color={colors.primary} />
                </View>
                <Text style={styles.optionLabel}>Tomar foto</Text>
                <Text style={styles.optionHint}>Con la cámara</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionCard, uploading && styles.disabled]}
                onPress={() => pickImage(false)}
                disabled={uploading}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: 'rgba(118,152,179,0.1)' }]}>
                  <Ionicons name="images" size={28} color={colors.tertiary} />
                </View>
                <Text style={styles.optionLabel}>Galería</Text>
                <Text style={styles.optionHint}>Foto existente</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionCard, uploading && styles.disabled]}
                onPress={pickPDF}
                disabled={uploading}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: 'rgba(239,68,68,0.08)' }]}>
                  <Ionicons name="document-text" size={28} color={colors.danger} />
                </View>
                <Text style={styles.optionLabel}>Subir PDF</Text>
                <Text style={styles.optionHint}>Archivo digital</Text>
              </TouchableOpacity>
            </View>

            {uploading && (
              <View style={styles.uploadBanner}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.uploadBannerText}>Subiendo carnet...</Text>
              </View>
            )}
          </View>

          {/* Saved carnets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Carnets guardados</Text>

            {loadingCarnets ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
            ) : carnets.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={44} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Sin carnets subidos</Text>
                <Text style={styles.emptyDesc}>
                  Usa las opciones de arriba para digitalizar el carnet físico
                </Text>
              </View>
            ) : (
              carnets.map((carnet) => (
                <View key={carnet.id} style={styles.carnetItem}>
                  {carnet.isPdf ? (
                    <View style={styles.pdfThumb}>
                      <Ionicons name="document-text" size={30} color={colors.danger} />
                    </View>
                  ) : (
                    <Image
                      source={{ uri: carnet.url }}
                      style={styles.imgThumb}
                      resizeMode="cover"
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.carnetLabel}>
                      {carnet.isPdf ? 'PDF del carnet' : 'Foto del carnet'}
                    </Text>
                    <Text style={styles.carnetHint}>Guardado en la nube</Text>
                  </View>
                  <View style={styles.carnetBadge}>
                    <Ionicons name="cloud-done" size={16} color={colors.success} />
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 19, fontWeight: 'bold', color: colors.secondary },
  headerSub: { fontSize: 13, color: colors.tertiary, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  section: { paddingHorizontal: 24, paddingTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.secondary, marginBottom: 6 },
  sectionDesc: { fontSize: 14, color: colors.tertiary, lineHeight: 20, marginBottom: 20 },

  optionsRow: { flexDirection: 'row', gap: 10 },
  optionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  disabled: { opacity: 0.45 },
  optionIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionLabel: { fontSize: 13, fontWeight: '700', color: colors.secondary, textAlign: 'center' },
  optionHint: { fontSize: 11, color: colors.tertiary, textAlign: 'center', marginTop: 3 },

  uploadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(162,128,185,0.08)',
    padding: 14,
    borderRadius: 12,
    marginTop: 14,
  },
  uploadBannerText: { fontSize: 14, color: colors.primary, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.secondary, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: colors.tertiary, textAlign: 'center', marginTop: 6, lineHeight: 18 },

  carnetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  imgThumb: { width: 64, height: 48, borderRadius: 8 },
  pdfThumb: {
    width: 64,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.07)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carnetLabel: { fontSize: 14, fontWeight: '600', color: colors.secondary },
  carnetHint: { fontSize: 12, color: colors.tertiary, marginTop: 2 },
  carnetBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
