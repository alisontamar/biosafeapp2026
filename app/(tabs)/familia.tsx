import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, ChevronRight, Shield, Clock, Check, Download, MapPin, X } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

const children = [
  {
    id: 1,
    name: 'Sofia Martinez',
    age: 8,
    pct: 85,
    img: 'https://images.pexels.com/photos/1620659/pexels-photo-1620659.jpeg?auto=compress&cs=tinysrgb&w=200',
    applied: [
      { name: 'BCG', date: '12 Ene 2018', center: 'Hospital Central BioSafe' },
      { name: 'Hepatitis B', date: '12 Ene 2018', center: 'Hospital Central BioSafe' },
      { name: 'Pentavalente 1ra', date: '15 Mar 2018', center: 'Centro de Salud Sur' },
      { name: 'Pentavalente 2da', date: '15 May 2018', center: 'Centro de Salud Sur' },
      { name: 'Triple Viral 1ra', date: '20 Ene 2019', center: 'BioSafe Miraflores' },
    ],
    pending: [
      { name: 'DT Refuerzo', date: 'Sugerida: 25 Jun 2026' },
      { name: 'Triple Viral 2da', date: 'Sugerida: Oct 2026' },
    ],
  },
  {
    id: 2,
    name: 'Lucas Martinez',
    age: 5,
    pct: 72,
    img: 'https://images.pexels.com/photos/1661179/pexels-photo-1661179.jpeg?auto=compress&cs=tinysrgb&w=200',
    applied: [
      { name: 'BCG', date: '03 Mar 2021', center: 'Hospital Norte BioSafe' },
      { name: 'Hepatitis B', date: '03 Mar 2021', center: 'Hospital Norte BioSafe' },
      { name: 'Pentavalente 1ra', date: '05 May 2021', center: 'Centro de Salud Norte' },
    ],
    pending: [
      { name: 'Pentavalente 3ra', date: 'Sugerida: Jul 2026' },
      { name: 'Neumococo', date: 'Sugerida: Ago 2026' },
      { name: 'Triple Viral 1ra', date: 'Sugerida: Mar 2027' },
    ],
  },
  {
    id: 3,
    name: 'Valentina Martinez',
    age: 2,
    pct: 60,
    img: 'https://images.pexels.com/photos/35537/child-children-girl-happy.jpg?auto=compress&cs=tinysrgb&w=200',
    applied: [
      { name: 'BCG', date: '10 Jun 2024', center: 'Clinica BioSafe Centro' },
      { name: 'Hepatitis B', date: '10 Jun 2024', center: 'Clinica BioSafe Centro' },
    ],
    pending: [
      { name: 'Pentavalente 1ra', date: 'Sugerida: Ago 2024' },
      { name: 'Rotavirus', date: 'Sugerida: Sep 2024' },
      { name: 'Neumococo', date: 'Sugerida: Oct 2024' },
    ],
  },
];

function getColor(pct: number) {
  if (pct >= 80) return Colors.success;
  if (pct >= 60) return Colors.warning;
  return Colors.error;
}

function DetailModal({ child, onClose }: { child: (typeof children)[0]; onClose: () => void }) {
  const [tab, setTab] = useState<'applied' | 'pending'>('applied');

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={detail.container}>
        <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={detail.header}>
          <TouchableOpacity style={detail.back} onPress={onClose}>
            <X color={Colors.white} size={22} strokeWidth={2.5} />
          </TouchableOpacity>
          <Image source={{ uri: child.img }} style={detail.avatar} />
          <Text style={detail.name}>{child.name}</Text>
          <Text style={detail.age}>{child.age} años</Text>
          <View style={detail.pctRow}>
            <Text style={detail.pctText}>Esquema al {child.pct}%</Text>
          </View>
        </LinearGradient>

        <View style={detail.tabs}>
          <TouchableOpacity style={[detail.tab, tab === 'applied' && detail.tabActive]} onPress={() => setTab('applied')}>
            <Text style={[detail.tabText, tab === 'applied' && detail.tabTextActive]}>Vacunas Aplicadas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[detail.tab, tab === 'pending' && detail.tabActive]} onPress={() => setTab('pending')}>
            <Text style={[detail.tabText, tab === 'pending' && detail.tabTextActive]}>Pendientes</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={detail.list} showsVerticalScrollIndicator={false}>
          {tab === 'applied'
            ? child.applied.map((v, i) => (
                <View key={i} style={detail.vaccineItem}>
                  <View style={detail.vaccineIconApplied}>
                    <Check color={Colors.success} size={18} strokeWidth={2.5} />
                  </View>
                  <View style={detail.vaccineInfo}>
                    <Text style={detail.vaccineName}>{v.name}</Text>
                    <Text style={detail.vaccineDate}>{v.date}</Text>
                    <View style={detail.verifiedRow}>
                      <Shield color={Colors.primary} size={12} strokeWidth={2} />
                      <Text style={detail.verifiedText}>{v.center}</Text>
                    </View>
                  </View>
                </View>
              ))
            : child.pending.map((v, i) => (
                <View key={i} style={detail.vaccineItem}>
                  <View style={detail.vaccineIconPending}>
                    <Clock color={Colors.warning} size={18} strokeWidth={2} />
                  </View>
                  <View style={detail.vaccineInfo}>
                    <Text style={detail.vaccineName}>{v.name}</Text>
                    <Text style={detail.vaccineDate}>{v.date}</Text>
                  </View>
                  <TouchableOpacity style={detail.centerBtn}>
                    <MapPin color={Colors.primary} size={14} strokeWidth={2} />
                    <Text style={detail.centerBtnText}>Centros</Text>
                  </TouchableOpacity>
                </View>
              ))}

          <TouchableOpacity style={detail.downloadBtn}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={detail.downloadGradient}>
              <Download color={Colors.white} size={18} strokeWidth={2} />
              <Text style={detail.downloadText}>Descargar Certificado PDF</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function FamiliaScreen() {
  const [selected, setSelected] = useState<(typeof children)[0] | null>(null);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>Mi Familia</Text>
        <Text style={styles.headerSub}>Gestiona los perfiles de tus dependientes</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {children.map((child) => (
            <TouchableOpacity key={child.id} style={styles.card} onPress={() => setSelected(child)} activeOpacity={0.85}>
              <Image source={{ uri: child.img }} style={styles.cardAvatar} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{child.name}</Text>
                <Text style={styles.cardAge}>{child.age} años</Text>
                <View style={styles.pctRow}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${child.pct}%`, backgroundColor: getColor(child.pct) }]} />
                  </View>
                  <Text style={[styles.pctText, { color: getColor(child.pct) }]}>Esquema al {child.pct}%</Text>
                </View>
              </View>
              <ChevronRight color={Colors.textMuted} size={20} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.addCard} activeOpacity={0.85}>
            <View style={styles.addIcon}>
              <Plus color={Colors.primary} size={24} strokeWidth={2} />
            </View>
            <Text style={styles.addText}>Agregar dependiente</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {selected && <DetailModal child={selected} onClose={() => setSelected(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 14 },
  card: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 20, padding: 16, alignItems: 'center', gap: 14, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },
  cardAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: Colors.primarySurface },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  cardAge: { fontSize: 13, color: Colors.textMuted },
  pctRow: { gap: 4, marginTop: 4 },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  pctText: { fontSize: 12, fontWeight: '600' },
  addCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', padding: 20, backgroundColor: Colors.white },
  addIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
});

const detail = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingBottom: 28, alignItems: 'center', gap: 8 },
  back: { position: 'absolute', top: 52, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' },
  name: { fontSize: 22, fontWeight: '800', color: Colors.white },
  age: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  pctRow: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  pctText: { fontSize: 13, color: Colors.white, fontWeight: '600' },
  tabs: { flexDirection: 'row', margin: 20, backgroundColor: Colors.border, borderRadius: 14, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.white, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  tabText: { fontSize: 14, color: Colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: Colors.primary },
  list: { flex: 1, paddingHorizontal: 20 },
  vaccineItem: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: 16, padding: 14, alignItems: 'center', gap: 12, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  vaccineIconApplied: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F7F0', alignItems: 'center', justifyContent: 'center' },
  vaccineIconPending: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },
  vaccineInfo: { flex: 1 },
  vaccineName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  vaccineDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  verifiedText: { fontSize: 11, color: Colors.primary, fontWeight: '500' },
  centerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primarySurface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  centerBtnText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  downloadBtn: { marginTop: 20, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  downloadGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  downloadText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
