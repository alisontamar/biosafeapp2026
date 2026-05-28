import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, QrCode, ChevronRight, Syringe, Clock, TrendingUp, Heart, Shield } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import QRModal from '@/components/QRModal';

const { width } = Dimensions.get('window');

const healthTips = [
  {
    id: 1,
    title: 'Importancia de las vacunas en la infancia',
    category: 'Prevención',
    image: 'https://images.pexels.com/photos/3985163/pexels-photo-3985163.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 2,
    title: '¿Cuándo aplicar la vacuna contra la influenza?',
    category: 'Consejos',
    image: 'https://images.pexels.com/photos/5863365/pexels-photo-5863365.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    id: 3,
    title: 'Nutrición y sistema inmune en niños',
    category: 'Salud',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

export default function HomeScreen() {
  const [showQR, setShowQR] = useState(false);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Buenos días,</Text>
            <Text style={styles.name}>Tamara!</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifBtn}>
              <Bell color={Colors.white} size={22} strokeWidth={2} />
              <View style={styles.notifBadge} />
            </TouchableOpacity>
            <Image
              source={{ uri: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100' }}
              style={styles.avatar}
            />
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Next Vaccine Widget */}
        <View style={styles.section}>
          <View style={styles.vaccineCard}>
            <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.vaccineGradient}>
              <View style={styles.vaccineTop}>
                <View style={styles.vaccineIconWrap}>
                  <Syringe color={Colors.white} size={24} strokeWidth={2} />
                </View>
                <View style={styles.vaccineBadge}>
                  <Clock color={Colors.warning} size={14} strokeWidth={2} />
                  <Text style={styles.vaccineBadgeText}>3 días restantes</Text>
                </View>
              </View>
              <Text style={styles.vaccineLabel}>Próxima Vacuna</Text>
              <Text style={styles.vaccineName}>Difteria-Tétanos (DT)</Text>
              <Text style={styles.vaccinePerson}>Sofia Martinez • 2da dosis</Text>
              <View style={styles.vaccineProgress}>
                <View style={styles.vaccineProgressBar}>
                  <View style={[styles.vaccineProgressFill, { width: '65%' }]} />
                </View>
                <Text style={styles.vaccineProgressText}>Esquema 65%</Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <TrendingUp color={Colors.primary} size={20} strokeWidth={2} />
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Menores</Text>
          </View>
          <View style={styles.statCard}>
            <Shield color={Colors.success} size={20} strokeWidth={2} />
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Vacunas</Text>
          </View>
          <View style={styles.statCard}>
            <Heart color={Colors.error} size={20} strokeWidth={2} />
            <Text style={styles.statValue}>85%</Text>
            <Text style={styles.statLabel}>Completado</Text>
          </View>
        </View>

        {/* News Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Consejos de Salud</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tipsScroll}>
            {healthTips.map((tip) => (
              <TouchableOpacity key={tip.id} style={styles.tipCard} activeOpacity={0.85}>
                <Image source={{ uri: tip.image }} style={styles.tipImage} />
                <View style={styles.tipContent}>
                  <View style={styles.tipCategoryBadge}>
                    <Text style={styles.tipCategory}>{tip.category}</Text>
                  </View>
                  <Text style={styles.tipTitle} numberOfLines={2}>{tip.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Family Quick Access */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mi Familia</Text>
            <TouchableOpacity style={styles.seeAllRow}>
              <Text style={styles.seeAll}>Ver todos</Text>
              <ChevronRight color={Colors.primary} size={16} />
            </TouchableOpacity>
          </View>
          {[
            { name: 'Sofia Martinez', age: 8, pct: 85, img: 'https://images.pexels.com/photos/1620659/pexels-photo-1620659.jpeg?auto=compress&cs=tinysrgb&w=100' },
            { name: 'Lucas Martinez', age: 5, pct: 72, img: 'https://images.pexels.com/photos/1661179/pexels-photo-1661179.jpeg?auto=compress&cs=tinysrgb&w=100' },
          ].map((child, i) => (
            <TouchableOpacity key={i} style={styles.familyRow} activeOpacity={0.8}>
              <Image source={{ uri: child.img }} style={styles.familyAvatar} />
              <View style={styles.familyInfo}>
                <Text style={styles.familyName}>{child.name}</Text>
                <Text style={styles.familyAge}>{child.age} años</Text>
              </View>
              <View style={styles.familyRight}>
                <Text style={styles.familyPct}>{child.pct}%</Text>
                <View style={styles.miniProgress}>
                  <View style={[styles.miniProgressFill, { width: `${child.pct}%` }]} />
                </View>
              </View>
              <ChevronRight color={Colors.textMuted} size={18} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating QR Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowQR(true)} activeOpacity={0.85}>
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.fabGradient}>
          <QrCode color={Colors.white} size={28} strokeWidth={2} />
        </LinearGradient>
      </TouchableOpacity>

      <QRModal visible={showQR} onClose={() => setShowQR(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '400' },
  name: { fontSize: 26, color: Colors.white, fontWeight: '800', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.warning,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  seeAll: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  seeAllRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  vaccineCard: { borderRadius: 20, overflow: 'hidden', elevation: 4, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
  vaccineGradient: { padding: 20 },
  vaccineTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  vaccineIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  vaccineBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  vaccineBadgeText: { fontSize: 12, color: Colors.white, fontWeight: '600' },
  vaccineLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 4 },
  vaccineName: { fontSize: 22, color: Colors.white, fontWeight: '800', marginBottom: 4 },
  vaccinePerson: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 16 },
  vaccineProgress: { gap: 6 },
  vaccineProgressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 },
  vaccineProgressFill: { height: 6, backgroundColor: Colors.white, borderRadius: 3 },
  vaccineProgressText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginTop: 16 },
  statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  tipsScroll: { paddingRight: 20, gap: 12 },
  tipCard: { width: 200, backgroundColor: Colors.white, borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  tipImage: { width: '100%', height: 110 },
  tipContent: { padding: 12, gap: 6 },
  tipCategoryBadge: { backgroundColor: Colors.primarySurface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  tipCategory: { fontSize: 10, color: Colors.primary, fontWeight: '700' },
  tipTitle: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', lineHeight: 18 },
  familyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 10, gap: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  familyAvatar: { width: 48, height: 48, borderRadius: 24 },
  familyInfo: { flex: 1 },
  familyName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  familyAge: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  familyRight: { alignItems: 'flex-end', gap: 4, marginRight: 4 },
  familyPct: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  miniProgress: { width: 60, height: 4, backgroundColor: Colors.border, borderRadius: 2 },
  miniProgressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  fab: { position: 'absolute', bottom: 96, right: 24, borderRadius: 32, elevation: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
  fabGradient: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
