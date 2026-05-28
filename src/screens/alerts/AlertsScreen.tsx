// src/screens/alerts/AlertsScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Card } from '../../components/Card';

const initialAlerts = [
  { 
    id: '1', 
    type: 'ai', 
    title: 'Análisis Predictivo', 
    message: 'Nuestros modelos indican un posible aumento de gripe estacional en Cochabamba para las próximas semanas. Recomendamos revisar el estado de la vacuna de influenza.', 
    date: 'Hace 2 horas' 
  },
  { 
    id: '2', 
    type: 'reminder', 
    title: 'Recordatorio Médico', 
    message: 'La vacuna Pentavalente de Lucía está programada para la próxima semana.', 
    date: 'Ayer' 
  },
];

export const AlertsScreen = () => {
  const [alerts, setAlerts] = useState(initialAlerts);

  const markAsRead = (id: string) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  const renderAlert = ({ item }: any) => {
    const isAI = item.type === 'ai';
    return (
      <Card style={[styles.alertCard, isAI && styles.aiAlertCard]}>
        <View style={styles.alertHeader}>
          <View style={styles.titleRow}>
            <Ionicons 
              name={isAI ? "pulse" : "calendar-outline"} 
              size={20} 
              color={isAI ? colors.primary : colors.tertiary} 
            />
            <Text style={[styles.alertTitle, isAI && styles.aiTitle]}>{item.title}</Text>
          </View>
          <Text style={styles.alertDate}>{item.date}</Text>
        </View>
        
        <Text style={styles.alertMessage}>{item.message}</Text>
        
        <TouchableOpacity style={styles.readButton} onPress={() => markAsRead(item.id)}>
          <Ionicons name="checkmark-done" size={16} color={colors.tertiary} />
          <Text style={styles.readButtonText}>Marcar como leída</Text>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alertas</Text>
        <Text style={styles.subtitle}>Impulsadas por IA</Text>
      </View>

      {alerts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={64} color={colors.tertiary} />
          <Text style={styles.emptyText}>Estás al día con todas tus alertas.</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          renderItem={renderAlert}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.secondary },
  subtitle: { fontSize: 16, color: colors.primary, fontWeight: '600', marginTop: 4 },
  listContainer: { paddingHorizontal: 24, paddingBottom: 100 },
  alertCard: { marginBottom: 16, padding: 20 },
  aiAlertCard: { borderColor: colors.primary, borderWidth: 1, backgroundColor: 'rgba(16, 185, 129, 0.03)' },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: colors.secondary, marginLeft: 8 },
  aiTitle: { color: colors.primary },
  alertDate: { fontSize: 12, color: colors.tertiary },
  alertMessage: { fontSize: 14, color: colors.tertiary, lineHeight: 22, marginBottom: 16 },
  readButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', padding: 8 },
  readButtonText: { fontSize: 14, color: colors.tertiary, marginLeft: 4, fontWeight: '500' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 16, color: colors.tertiary, textAlign: 'center', marginTop: 16 },
});