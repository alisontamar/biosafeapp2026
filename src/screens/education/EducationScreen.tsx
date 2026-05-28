// src/screens/education/EducationScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, FlatList, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Card } from '../../components/Card';

const categories = ['Todas', 'Recién Nacidos', 'Escolar', 'Post-vacuna', 'Nutrición'];
const articles = [
  { id: '1', title: '¿Qué esperar después de la vacuna Pentavalente?', category: 'Post-vacuna', readTime: '3 min' },
  { id: '2', title: 'Guía de esquema de vacunación escolar 2026', category: 'Escolar', readTime: '5 min' },
];

export const EducationScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Educación</Text>
        
        {/* Buscador */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.tertiary} style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar artículos o videos..."
            placeholderTextColor={colors.tertiary}
          />
        </View>
      </View>

      {/* Categorías */}
      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
          {categories.map((cat, index) => (
            <TouchableOpacity key={index} style={[styles.categoryBadge, index === 0 && styles.categoryBadgeActive]}>
              <Text style={[styles.categoryText, index === 0 && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista de Artículos */}
      <FlatList
        data={articles}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <Card style={styles.articleCard}>
            <View style={styles.articlePlaceholder}>
              <Ionicons name="image-outline" size={32} color={colors.tertiary} />
            </View>
            <View style={styles.articleInfo}>
              <Text style={styles.articleCategory}>{item.category}</Text>
              <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.articleMeta}>Lectura • {item.readTime}</Text>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.secondary, marginBottom: 20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: '#E5E7EB' },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, color: colors.secondary, fontSize: 16 },
  categoriesWrapper: { height: 60, marginBottom: 8 },
  categoriesContainer: { paddingHorizontal: 24, alignItems: 'center' },
  categoryBadge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.background, marginRight: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  categoryBadgeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.tertiary, fontWeight: '600' },
  categoryTextActive: { color: colors.background },
  listContainer: { paddingHorizontal: 24, paddingBottom: 100 },
  articleCard: { flexDirection: 'row', padding: 12, marginBottom: 16 },
  articlePlaceholder: { width: 80, height: 80, backgroundColor: colors.surface, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  articleInfo: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  articleCategory: { fontSize: 12, color: colors.primary, fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
  articleTitle: { fontSize: 16, fontWeight: 'bold', color: colors.secondary, marginBottom: 8 },
  articleMeta: { fontSize: 12, color: colors.tertiary },
});