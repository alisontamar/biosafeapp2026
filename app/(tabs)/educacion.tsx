import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Play, Clock, BookOpen, ChevronRight } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

const categories = ['Todos', 'Recién nacidos', 'Etapa escolar', 'Post-vacunación'];

const articles = [
  {
    id: 1,
    title: 'Vacunas en el recién nacido: lo que debes saber',
    category: 'Recién nacidos',
    type: 'article',
    readTime: '5 min',
    image: 'https://images.pexels.com/photos/35537/child-children-girl-happy.jpg?auto=compress&cs=tinysrgb&w=400',
    featured: true,
  },
  {
    id: 2,
    title: 'Cómo preparar a tu hijo para la vacunación',
    category: 'Etapa escolar',
    type: 'video',
    readTime: '3 min',
    image: 'https://images.pexels.com/photos/5863365/pexels-photo-5863365.jpeg?auto=compress&cs=tinysrgb&w=400',
    featured: false,
  },
  {
    id: 3,
    title: 'Efectos secundarios comunes y cómo manejarlos',
    category: 'Post-vacunación',
    type: 'article',
    readTime: '7 min',
    image: 'https://images.pexels.com/photos/3985163/pexels-photo-3985163.jpeg?auto=compress&cs=tinysrgb&w=400',
    featured: false,
  },
  {
    id: 4,
    title: 'Calendario oficial de vacunación Bolivia 2026',
    category: 'Todos',
    type: 'article',
    readTime: '10 min',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
    featured: false,
  },
  {
    id: 5,
    title: 'Triple Viral: protección contra sarampión, rubéola y paperas',
    category: 'Etapa escolar',
    type: 'video',
    readTime: '4 min',
    image: 'https://images.pexels.com/photos/1438081/pexels-photo-1438081.jpeg?auto=compress&cs=tinysrgb&w=400',
    featured: false,
  },
  {
    id: 6,
    title: 'Vacuna BCG: cuándo y por qué es esencial',
    category: 'Recién nacidos',
    type: 'article',
    readTime: '6 min',
    image: 'https://images.pexels.com/photos/356040/pexels-photo-356040.jpeg?auto=compress&cs=tinysrgb&w=400',
    featured: false,
  },
];

export default function EducacionScreen() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  const filtered = articles.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'Todos' || a.category === activeCategory;
    return matchSearch && matchCat;
  });

  const featured = filtered.find((a) => a.featured);
  const rest = filtered.filter((a) => !a.featured);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>Centro de Educación</Text>
        <Text style={styles.headerSub}>Guías, artículos y videos de salud pública</Text>
        <View style={styles.searchContainer}>
          <Search color={Colors.textMuted} size={18} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar vacuna o tema..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catsScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, activeCategory === cat && styles.catChipActive]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Article */}
        {featured && (
          <TouchableOpacity style={styles.featuredCard} activeOpacity={0.85}>
            <Image source={{ uri: featured.image }} style={styles.featuredImage} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.featuredOverlay}>
              <View style={styles.featuredBadge}>
                <BookOpen color={Colors.white} size={12} strokeWidth={2} />
                <Text style={styles.featuredBadgeText}>Destacado</Text>
              </View>
              <Text style={styles.featuredTitle}>{featured.title}</Text>
              <View style={styles.featuredMeta}>
                <Clock color='rgba(255,255,255,0.8)' size={12} strokeWidth={2} />
                <Text style={styles.featuredMetaText}>{featured.readTime} de lectura</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Articles List */}
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>Artículos y Videos</Text>
          {rest.map((item) => (
            <TouchableOpacity key={item.id} style={styles.articleRow} activeOpacity={0.8}>
              <Image source={{ uri: item.image }} style={styles.articleThumb} />
              {item.type === 'video' && (
                <View style={styles.playOverlay}>
                  <Play color={Colors.white} size={14} strokeWidth={2} fill={Colors.white} />
                </View>
              )}
              <View style={styles.articleInfo}>
                <View style={styles.articleCatBadge}>
                  <Text style={styles.articleCatText}>{item.category}</Text>
                </View>
                <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.articleMeta}>
                  <Clock color={Colors.textMuted} size={12} strokeWidth={2} />
                  <Text style={styles.articleMetaText}>{item.readTime}</Text>
                  <Text style={[styles.articleMetaText, { marginLeft: 4 }]}>• {item.type === 'video' ? 'Video' : 'Artículo'}</Text>
                </View>
              </View>
              <ChevronRight color={Colors.textMuted} size={18} />
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <BookOpen color={Colors.textMuted} size={48} strokeWidth={1.5} />
            <Text style={styles.emptyText}>No se encontraron resultados</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24, gap: 6 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  scroll: { flex: 1 },
  catsScroll: { paddingHorizontal: 20, paddingVertical: 16, gap: 10 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  catTextActive: { color: Colors.white },
  featuredCard: { marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', height: 200, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  featuredBadgeText: { fontSize: 10, color: Colors.white, fontWeight: '700' },
  featuredTitle: { fontSize: 16, fontWeight: '700', color: Colors.white, lineHeight: 22, marginBottom: 4 },
  featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featuredMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  listSection: { padding: 20, gap: 12 },
  listTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  articleRow: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 16, padding: 12, alignItems: 'center', gap: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  articleThumb: { width: 72, height: 72, borderRadius: 12 },
  playOverlay: { position: 'absolute', left: 36, top: 36, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  articleInfo: { flex: 1, gap: 4 },
  articleCatBadge: { backgroundColor: Colors.primarySurface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  articleCatText: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
  articleTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, lineHeight: 20 },
  articleMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  articleMetaText: { fontSize: 11, color: Colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textMuted, fontWeight: '500' },
});
