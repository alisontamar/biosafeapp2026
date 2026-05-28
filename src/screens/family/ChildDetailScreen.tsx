// src/screens/family/ChildDetailScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Card } from '../../components/Card';

const vaccinesData = [
  { id: '1', name: 'BCG (Tuberculosis)', date: '10 Ene 2024', status: 'applied' },
  { id: '2', name: 'Pentavalente', date: '15 Mar 2024', status: 'applied' },
  { id: '3', name: 'Sarampión, Rubéola (SRP)', date: 'Pendiente', status: 'pending', dueIn: '12 días' },
];

export const ChildDetailScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<'applied' | 'pending'>('pending');

  const filteredVaccines = vaccinesData.filter(v => v.status === activeTab);

  const renderVaccine = ({ item }: any) => (
    <Card style={styles.vaccineCard}>
      <View style={styles.vaccineInfo}>
        <Text style={styles.vaccineName}>{item.name}</Text>
        <Text style={styles.vaccineDate}>
          {item.status === 'applied' ? `Aplicada: ${item.date}` : `Vence en: ${item.dueIn}`}
        </Text>
      </View>
      <Ionicons 
        name={item.status === 'applied' ? "checkmark-circle" : "time-outline"} 
        size={28} 
        color={item.status === 'applied' ? colors.success : colors.warning} 
      />
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header con botón de volver */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expediente Médico</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarLarge}>
          <Ionicons name="happy" size={48} color={colors.primary} />
        </View>
        <Text style={styles.childName}>Mateo Gomez</Text>
        <Text style={styles.childId}>CI: 12345678</Text>
      </View>

      {/* Tabs Custom */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]} 
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pendientes ⏳</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'applied' && styles.activeTab]} 
          onPress={() => setActiveTab('applied')}
        >
          <Text style={[styles.tabText, activeTab === 'applied' && styles.activeTabText]}>Aplicadas ✅</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredVaccines}
        renderItem={renderVaccine}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />

      {/* Botones de Acción Fijos */}
      <View style={styles.actionFooter}>
        <TouchableOpacity style={styles.actionButtonSecondary}>
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={styles.actionButtonTextSecondary}>Centros Cercanos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonPrimary}>
          <Ionicons name="document-text-outline" size={20} color={colors.background} />
          <Text style={styles.actionButtonTextPrimary}>Descargar PDF</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.secondary },
  profileSection: { alignItems: 'center', marginBottom: 24 },
  avatarLarge: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  childName: { fontSize: 24, fontWeight: 'bold', color: colors.secondary },
  childId: { fontSize: 16, color: colors.tertiary, marginTop: 4 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#E5E7EB' },
  activeTab: { borderBottomColor: colors.primary },
  tabText: { fontSize: 16, color: colors.tertiary, fontWeight: '600' },
  activeTabText: { color: colors.primary },
  listContainer: { paddingHorizontal: 24, paddingBottom: 100 },
  vaccineCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  vaccineInfo: { flex: 1 },
  vaccineName: { fontSize: 16, fontWeight: 'bold', color: colors.secondary, marginBottom: 4 },
  vaccineDate: { fontSize: 14, color: colors.tertiary },
  actionFooter: { flexDirection: 'row', padding: 24, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 12 },
  actionButtonSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.primary },
  actionButtonTextSecondary: { color: colors.primary, fontWeight: 'bold', marginLeft: 8 },
  actionButtonPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, backgroundColor: colors.primary },
  actionButtonTextPrimary: { color: colors.background, fontWeight: 'bold', marginLeft: 8 },
});