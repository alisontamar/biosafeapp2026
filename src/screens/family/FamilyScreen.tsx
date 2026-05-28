// src/screens/family/FamilyScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Card } from '../../components/Card';

// Data simulada
const familyData = [
  { id: '1', name: 'Mateo Gomez', age: '2 años', progress: 85 },
  { id: '2', name: 'Lucía Gomez', age: '6 meses', progress: 40 },
];

export const FamilyScreen = ({ navigation }: any) => {
  
  const renderChildCard = ({ item }: any) => (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={() => navigation.navigate('ChildDetail', { childId: item.id })}
    >
      <Card style={styles.childCard}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Ionicons name="happy-outline" size={32} color={colors.primary} />
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.childName}>{item.name}</Text>
            <Text style={styles.childAge}>{item.age}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.tertiary} />
        </View>

        {/* Barra de progreso de vacunación */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTextRow}>
            <Text style={styles.progressLabel}>Progreso del esquema</Text>
            <Text style={styles.progressPercentage}>{item.progress}%</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${item.progress}%` }]} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Familia</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color={colors.background} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={familyData}
        renderItem={renderChildCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.secondary },
  addButton: { backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  listContainer: { paddingHorizontal: 24, paddingBottom: 100 }, // paddingBottom para el botón flotante
  
  childCard: { marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(16, 185, 129, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoContainer: { flex: 1 },
  childName: { fontSize: 18, fontWeight: 'bold', color: colors.secondary, marginBottom: 4 },
  childAge: { fontSize: 14, color: colors.tertiary },
  
  progressContainer: { marginTop: 8 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 14, color: colors.tertiary },
  progressPercentage: { fontSize: 14, fontWeight: 'bold', color: colors.primary },
  progressBarBackground: { height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
});