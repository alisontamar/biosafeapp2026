// src/screens/home/HomeScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';

export const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header userName="Tamara" />
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Widget: Próxima Vacuna */}
        <Text style={styles.sectionTitle}>Prioridad</Text>
        <Card style={styles.widgetCard}>
          <View style={styles.widgetHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="medical" size={24} color={colors.background} />
            </View>
            <View style={styles.widgetBadge}>
              <Text style={styles.badgeText}>Faltan 12 días</Text>
            </View>
          </View>
          
          <Text style={styles.vaccineName}>Sarampión, Rubéola y Paperas (SRP)</Text>
          <Text style={styles.childName}>Para: Mateo Gomez</Text>
          
          <TouchableOpacity style={styles.widgetButton}>
            <Text style={styles.widgetButtonText}>Agendar en centro cercano</Text>
          </TouchableOpacity>
        </Card>

        {/* Sección: Tips de Salud */}
        <Text style={styles.sectionTitle}>Recomendaciones para ti</Text>
        
        <Card style={styles.tipCard}>
          <Ionicons name="water-outline" size={32} color={colors.primary} />
          <View style={styles.tipTextContainer}>
            <Text style={styles.tipTitle}>Hidratación post-vacuna</Text>
            <Text style={styles.tipDescription}>Es normal presentar fiebre leve. Mantén a Mateo hidratado durante las próximas 24h.</Text>
          </View>
        </Card>

        <Card style={styles.tipCard}>
          <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} />
          <View style={styles.tipTextContainer}>
            <Text style={styles.tipTitle}>Esquema completo</Text>
            <Text style={styles.tipDescription}>Estás al 85% de completar el esquema base de este año. ¡Sigue así!</Text>
          </View>
        </Card>

        {/* Espacio extra al final para que el botón flotante del QR no tape el contenido */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, paddingHorizontal: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.secondary, marginTop: 24, marginBottom: 16 },
  
  // Widget
  widgetCard: { backgroundColor: colors.primary, borderColor: colors.primary },
  widgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconContainer: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12 },
  widgetBadge: { backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: colors.primary, fontWeight: 'bold', fontSize: 12 },
  vaccineName: { fontSize: 20, fontWeight: 'bold', color: colors.background, marginBottom: 4 },
  childName: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 20 },
  widgetButton: { backgroundColor: colors.background, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  widgetButtonText: { color: colors.secondary, fontWeight: 'bold', fontSize: 14 },

  // Tips
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, backgroundColor: colors.background },
  tipTextContainer: { flex: 1, marginLeft: 16 },
  tipTitle: { fontSize: 16, fontWeight: 'bold', color: colors.secondary, marginBottom: 4 },
  tipDescription: { fontSize: 14, color: colors.tertiary, lineHeight: 20 },
});