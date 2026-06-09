import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { colors } from '../../theme/colors';
import { supabase } from '../../lib/supabase';
import { QRModal } from '../../components/QRModal';
import { CarnetUploadModal } from '../../components/CarnetUploadModal';

// ─── Mapas de clima y IA ─────────────────────────────────────────
const WMO: Record<string, string> = {
  '0': 'cielo despejado', '1': 'principalmente despejado', '2': 'parcialmente nublado',
  '3': 'nublado', '45': 'niebla', '48': 'niebla con escarcha',
  '51': 'llovizna ligera', '53': 'llovizna moderada', '55': 'llovizna densa',
  '61': 'lluvia ligera', '63': 'lluvia moderada', '65': 'lluvia fuerte',
  '71': 'nevada ligera', '73': 'nevada moderada', '75': 'nevada fuerte',
  '80': 'chubascos ligeros', '81': 'chubascos moderados', '82': 'chubascos fuertes',
  '95': 'tormenta eléctrica', '96': 'tormenta con granizo', '99': 'tormenta fuerte',
};

const ICONO_MAP: Record<string, { icon: string; color: string; bg: string }> = {
  sunny:    { icon: 'sunny-outline',           color: '#F59E0B', bg: '#FEF3C7' },
  rainy:    { icon: 'rainy-outline',            color: '#3B82F6', bg: '#DBEAFE' },
  cold:     { icon: 'snow-outline',             color: '#6366F1', bg: '#EEF2FF' },
  hot:      { icon: 'thermometer-outline',      color: '#EF4444', bg: '#FEE2E2' },
  wind:     { icon: 'flag-outline',             color: '#8B5CF6', bg: '#EDE9FE' },
  baby:     { icon: 'heart-outline',            color: '#EC4899', bg: '#FCE7F3' },
  child:    { icon: 'people-outline',           color: '#10B981', bg: '#D1FAE5' },
  pregnant: { icon: 'heart',                    color: '#EC4899', bg: '#FCE7F3' },
  shield:   { icon: 'shield-checkmark-outline', color: '#10B981', bg: '#D1FAE5' },
  medical:  { icon: 'medical-outline',          color: '#a281ba', bg: 'rgba(162,129,186,0.1)' },
};

const FALLBACK_RECS = [
  { icono: 'shield', titulo: 'Vacunas al día', descripcion: 'Verifica que las vacunas de tu familia estén al corriente.' },
  { icono: 'medical', titulo: 'Buena hidratación', descripcion: 'Bebe al menos 8 vasos de agua al día.' },
  { icono: 'child', titulo: 'Cuida a los niños', descripcion: 'Asegúrate de que los más pequeños estén abrigados y protegidos.' },
];

type Rec = { icono: string; titulo: string; descripcion: string };
type ClimaInfo = { temp: number; sensacion: number; desc: string; ciudad: string };

export const HomeScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [proximaVacuna, setProximaVacuna] = useState<any>(null);

  // tutorPaciente = el primer paciente (el tutor mismo)
  const [tutorPaciente, setTutorPaciente] = useState<any>(null);
  // hijos = los pacientes adicionales añadidos
  const [hijos, setHijos] = useState<any[]>([]);

  // Modal añadir hijo
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newGender, setNewGender] = useState<'M' | 'F'>('M');

  // QR modal
  const [qrPaciente, setQrPaciente] = useState<any>(null);

  // Carnet upload modal
  const [carnetPaciente, setCarnetPaciente] = useState<any>(null);

  // Recomendaciones IA
  const [recs, setRecs] = useState<Rec[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [climaInfo, setClimaInfo] = useState<ClimaInfo | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const pacientesRef = useRef<any[]>([]);
  const profileRef = useRef<any>(null);
  const appState = useRef(AppState.currentState);

  // Carga inicial al montar
  useEffect(() => { cargarDatosHome(); }, []);

  // Recomendaciones solo se refrescan cuando la app vuelve del background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        if (profileRef.current) {
          cargarRecomendaciones(profileRef.current, pacientesRef.current);
        }
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  const cargarDatosHome = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      const { data: profile } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id_usuario', session.user.id)
        .single();

      if (!profile) return;
      setUserData(profile);

      if (profile.rol === 'Tutor_PersonaNormal') {
        const { data: pacientes } = await supabase
          .from('pacientes')
          .select('id_paciente, nombre_completo, fecha_nacimiento, sexo, codigo_qr_token')
          .eq('id_tutor_registro', profile.id_usuario)
          .order('fecha_registro', { ascending: true });

        const todos = pacientes || [];
        // El primer registro es el tutor mismo (creado al registrarse)
        const [primero, ...resto] = todos;
        setTutorPaciente(primero || null);
        setHijos(resto);

        if (todos.length > 0) {
          const idsPacientes = todos.map((p) => p.id_paciente);
          const { data: dosis } = await supabase
            .from('dosis_aplicadas')
            .select(`
              fecha_vencimiento_proxima,
              cat_vacunas_oficiales ( nombre_enfermedad ),
              pacientes ( nombre_completo )
            `)
            .in('id_paciente', idsPacientes)
            .not('fecha_vencimiento_proxima', 'is', null)
            .gte('fecha_vencimiento_proxima', new Date().toISOString())
            .order('fecha_vencimiento_proxima', { ascending: true })
            .limit(1)
            .single();

          if (dosis) setProximaVacuna(dosis);
        }

        // Guardar en refs para el listener de AppState
        profileRef.current = profile;
        pacientesRef.current = todos;

        // Verificar permiso de ubicación: mostrar modal si nunca se pidió
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'undetermined') {
          setShowLocationModal(true);
        } else {
          // Ya hay decisión tomada → cargar recomendaciones directamente
          cargarRecomendaciones(profile, todos);
        }
      }
    } catch (error) {
      console.error('Error al cargar Home:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularDias = (fechaVencimiento: string) => {
    const diff = new Date(fechaVencimiento).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const calcularEdad = (fechaNac: string) => {
    const hoy = new Date();
    const nac = new Date(fechaNac);
    const meses =
      (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth());
    if (meses < 12) return `${meses} meses`;
    return `${Math.floor(meses / 12)} años`;
  };

  const edadMeses = (fechaNac: string) => {
    const hoy = new Date();
    const nac = new Date(fechaNac);
    return (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth());
  };

  const cargarRecomendaciones = async (profile: any, pacientes: any[]) => {
    setRecsLoading(true);
    try {
      // 1. Geolocalización: GPS si hay permiso, sino por IP, sino La Paz
      let lat = -16.5, lon = -68.15, ciudad = 'Bolivia';
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          // Geocodificación inversa para obtener el nombre de la ciudad
          const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
          ciudad = place?.city ?? place?.region ?? 'Bolivia';
        } else {
          // Fallback: geolocalización por IP
          const geo = await fetch('https://ip-api.com/json/?fields=lat,lon,city').then(r => r.json());
          if (geo?.lat) { lat = geo.lat; lon = geo.lon; ciudad = geo.city || ciudad; }
        }
      } catch { /* usa La Paz */ }

      // 2. Clima actual de OpenMeteo
      const wRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m&timezone=auto`
      );
      const wd = await wRes.json();
      const curr = wd.current;
      const desc = WMO[String(curr.weathercode)] ?? 'condición variable';

      setClimaInfo({
        temp: Math.round(curr.temperature_2m),
        sensacion: Math.round(curr.apparent_temperature),
        desc,
        ciudad,
      });

      // 3. Contexto familiar
      const bebes    = pacientes.filter(p => edadMeses(p.fecha_nacimiento) < 12);
      const ninos    = pacientes.filter(p => { const m = edadMeses(p.fecha_nacimiento); return m >= 12 && m < 144; });
      const embzs    = pacientes.filter(p => p.es_embarazada);
      const esEmb    = profile.es_embarazada || embzs.length > 0;

      const familiaCtx: string[] = [];
      if (bebes.length)  familiaCtx.push(`${bebes.length} bebé(s) menor(es) de 1 año`);
      if (ninos.length)  familiaCtx.push(`${ninos.length} niño(s) de 1–12 años`);
      if (esEmb)         familiaCtx.push('hay una persona embarazada en la familia');
      const ctxStr = familiaCtx.length
        ? `Familia a cargo: ${familiaCtx.join(', ')}.`
        : 'Sin hijos registrados.';

      // 4. Prompt para Groq
      const prompt =
        `Eres asesor de salud preventiva para Bolivia. Clima hoy en ${ciudad}: ` +
        `${curr.temperature_2m}°C (sensación ${curr.apparent_temperature}°C), ${desc}, ` +
        `viento ${curr.windspeed_10m} km/h. ${ctxStr} ` +
        `Genera 3 recomendaciones de salud para hoy, breves y específicas al clima y contexto. ` +
        `Responde SOLO con JSON válido (sin markdown): ` +
        `{"items":[{"icono":"ICON","titulo":"MAX 4 PALABRAS","descripcion":"MAX 15 PALABRAS"},` +
        `{"icono":"ICON","titulo":"...","descripcion":"..."},{"icono":"ICON","titulo":"...","descripcion":"..."}]} ` +
        `Iconos válidos: sunny rainy cold hot wind baby child pregnant shield medical`;

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.6,
          max_tokens: 350,
          response_format: { type: 'json_object' },
        }),
      });

      const groqData = await groqRes.json();
      const content: string = groqData.choices?.[0]?.message?.content ?? '';
      const parsed = JSON.parse(content);
      const items: Rec[] = parsed.items ?? parsed.recomendaciones ?? parsed;
      setRecs(Array.isArray(items) ? items.slice(0, 3) : FALLBACK_RECS);
    } catch (e) {
      console.log('Recs IA error:', e);
      setRecs(FALLBACK_RECS);
    } finally {
      setRecsLoading(false);
    }
  };

  const handleLocationPermission = async (allow: boolean) => {
    setShowLocationModal(false);
    if (allow) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      // Recargar recomendaciones con la nueva ubicación (GPS si se concedió)
      cargarRecomendaciones(profileRef.current, pacientesRef.current);
    }
  };

  const handleAddChild = async () => {
    if (!newName.trim() || !newBirthDate.trim()) {
      Alert.alert('Error', 'Completa todos los campos.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newBirthDate)) {
      Alert.alert('Error', 'Formato de fecha: AAAA-MM-DD');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const token =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `biosafe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { data: inserted, error } = await supabase
        .from('pacientes')
        .insert([{
          id_tutor_registro: session.user.id,
          nombre_completo: newName.trim(),
          fecha_nacimiento: newBirthDate.trim(),
          sexo: newGender,
          es_embarazada: false,
          codigo_qr_token: token,
        }])
        .select('id_paciente, nombre_completo, codigo_qr_token')
        .single();

      if (error) throw error;

      await supabase
        .from('usuarios')
        .update({ tiene_hijos: true })
        .eq('id_usuario', session.user.id);

      setShowAddModal(false);
      setNewName('');
      setNewBirthDate('');
      setNewGender('M');
      cargarDatosHome();

      // Ofrecer subir el carnet físico antiguo
      Alert.alert(
        `¡${newName.trim()} añadido!`,
        '¿Deseas subir su carnet de vacunación físico para guardar el historial antiguo?',
        [
          { text: 'Después', style: 'cancel' },
          {
            text: 'Subir Carnet',
            onPress: () => setCarnetPaciente(inserted),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo añadir.');
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────── VISTA TUTOR ──────────────────────────

  const renderTutorView = () => (
    <>
      {/* ── Mi Carnet (QR del tutor) ── */}
      {tutorPaciente && (
        <>
          <Text style={styles.sectionLabel}>Mi carnet</Text>
          <LinearGradient colors={['#7e57c2', '#b39ddb']} style={styles.myQrCard}>
            <View style={styles.myQrLeft}>
              <View style={styles.myQrAvatar}>
                <Ionicons name="person" size={26} color="#7e57c2" />
              </View>
              <View>
                <Text style={styles.myQrName} numberOfLines={1}>
                  {tutorPaciente.nombre_completo.split(' ')[0]}
                </Text>
                <Text style={styles.myQrSub}>Titular de la cuenta</Text>
              </View>
            </View>
            <View style={styles.myQrActions}>
              <TouchableOpacity
                style={styles.myQrBtn}
                onPress={() => setQrPaciente(tutorPaciente)}
              >
                <Ionicons name="qr-code" size={18} color="#7e57c2" />
                <Text style={styles.myQrBtnText}>Ver QR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.myQrBtn, { backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 6 }]}
                onPress={() => setCarnetPaciente(tutorPaciente)}
              >
                <Ionicons name="camera" size={18} color="white" />
                <Text style={[styles.myQrBtnText, { color: 'white' }]}>Carnet</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </>
      )}

      {/* ── Próxima Vacuna ── */}
      {proximaVacuna ? (
        <>
          <Text style={styles.sectionLabel}>Próxima vacuna</Text>
          <Card style={styles.vacunaCard}>
            <View style={styles.vacunaIconWrap}>
              <Ionicons name="medical" size={20} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vacunaNombre}>
                {proximaVacuna.cat_vacunas_oficiales?.nombre_enfermedad || 'Refuerzo programado'}
              </Text>
              <Text style={styles.vacunaPara}>
                Para {proximaVacuna.pacientes?.nombre_completo}
              </Text>
            </View>
            <View style={styles.vacunaDias}>
              <Text style={styles.vacunaDiasNum}>{calcularDias(proximaVacuna.fecha_vencimiento_proxima)}</Text>
              <Text style={styles.vacunaDiasLabel}>días</Text>
            </View>
          </Card>
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Estado de vacunas</Text>
          <Card style={[styles.vacunaCard, { borderColor: '#10b981' }]}>
            <View style={[styles.vacunaIconWrap, { backgroundColor: '#10b981' }]}>
              <Ionicons name="checkmark-circle" size={20} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vacunaNombre}>¡Todo al día!</Text>
              <Text style={styles.vacunaPara}>No hay vacunas próximas pendientes</Text>
            </View>
          </Card>
        </>
      )}

      {/* ── Mis Hijos ── */}
      <View style={styles.hijosHeader}>
        <Text style={styles.sectionLabel}>Mis hijos</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={18} color="white" />
          <Text style={styles.addBtnText}>Añadir</Text>
        </TouchableOpacity>
      </View>

      {hijos.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={44} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Aún no tienes hijos registrados</Text>
          <Text style={styles.emptyDesc}>Añade a tus hijos para gestionar sus vacunas y carnets</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddModal(true)}>
            <Text style={styles.emptyBtnText}>+ Añadir hijo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        hijos.map((hijo) => (
          <TouchableOpacity
            key={hijo.id_paciente}
            activeOpacity={0.75}
            onPress={() =>
              router.push({ pathname: '/(tabs)/family/[id]', params: { id: hijo.id_paciente } })
            }
          >
            <Card style={styles.hijoCard}>
              <View style={styles.hijoAvatar}>
                <Ionicons
                  name={hijo.sexo === 'F' ? 'woman' : 'man'}
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.hijoInfo}>
                <Text style={styles.hijoNombre}>{hijo.nombre_completo}</Text>
                <Text style={styles.hijoEdad}>{calcularEdad(hijo.fecha_nacimiento)}</Text>
              </View>
              <View style={styles.hijoAcciones}>
                <TouchableOpacity
                  style={styles.accionBtn}
                  onPress={() => setCarnetPaciente(hijo)}
                >
                  <Ionicons name="camera-outline" size={18} color={colors.tertiary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.accionBtn, { backgroundColor: 'rgba(162,128,185,0.12)' }]}
                  onPress={() => setQrPaciente(hijo)}
                >
                  <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}

      {/* ── Recomendaciones IA ── */}
      <View style={styles.recsHeader}>
        <Text style={[styles.sectionLabel, { marginTop: 8, marginBottom: 0 }]}>Recomendaciones del día</Text>
        {climaInfo && (
          <View style={styles.climaBadge}>
            <Ionicons name="thermometer-outline" size={13} color="#6366F1" />
            <Text style={styles.climaBadgeText}>{climaInfo.temp}°C · {climaInfo.ciudad}</Text>
          </View>
        )}
      </View>

      {climaInfo && (
        <View style={styles.climaCard}>
          <Ionicons name="partly-sunny-outline" size={20} color="#F59E0B" />
          <Text style={styles.climaDesc}>{climaInfo.desc}, {climaInfo.sensacion}°C de sensación</Text>
        </View>
      )}

      {recsLoading ? (
        <View style={styles.recsLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.recsLoadingText}>Generando recomendaciones...</Text>
        </View>
      ) : (
        (recs.length > 0 ? recs : FALLBACK_RECS).map((rec, i) => {
          const ic = ICONO_MAP[rec.icono] ?? ICONO_MAP.medical;
          return (
            <Card key={i} style={styles.tipCard}>
              <View style={[styles.tipIcon, { backgroundColor: ic.bg }]}>
                <Ionicons name={ic.icon as any} size={22} color={ic.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipTitle}>{rec.titulo}</Text>
                <Text style={styles.tipDesc}>{rec.descripcion}</Text>
              </View>
            </Card>
          );
        })
      )}
    </>
  );

  // ─────────────────── VISTA CENTRO DE SALUD ────────────────────

  const renderHealthCenterView = () => (
    <>
      <Text style={styles.sectionLabel}>Acceso rápido</Text>
      <TouchableOpacity style={styles.scanBtn} onPress={() => router.push('/(tabs)/qr')}>
        <View style={styles.scanIconBg}>
          <Ionicons name="qr-code-outline" size={38} color="white" />
        </View>
        <Text style={styles.scanTitle}>Escanear Carnet QR</Text>
        <Text style={styles.scanDesc}>Identificar paciente y registrar dosis</Text>
      </TouchableOpacity>

      <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Resumen del día</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="people-outline" size={22} color={colors.primary} />
          <Text style={styles.statNum}>12</Text>
          <Text style={styles.statLabel}>Atendidos</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="color-fill-outline" size={22} color="#10b981" />
          <Text style={styles.statNum}>18</Text>
          <Text style={styles.statLabel}>Dosis aplicadas</Text>
        </View>
      </View>

      <Card style={[styles.tipCard, { borderColor: '#fee2e2' }]}>
        <View style={[styles.tipIcon, { backgroundColor: 'rgba(239,68,68,0.08)' }]}>
          <Ionicons name="warning-outline" size={22} color={colors.danger} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tipTitle, { color: colors.danger }]}>Alerta de Stock IA</Text>
          <Text style={styles.tipDesc}>Quedan menos de 10 dosis de Neumococo en el inventario.</Text>
        </View>
      </Card>
    </>
  );

  // ─────────────────────────── RENDER ───────────────────────────

  if (loading) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isTutor = userData?.rol === 'Tutor_PersonaNormal';
  const nombreCorto = userData?.nombre_completo?.split(' ')[0] || 'Usuario';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        userName={nombreCorto}
        userFullName={userData?.nombre_completo}
        userEmail={userData?.correo_electronico}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {isTutor ? renderTutorView() : renderHealthCenterView()}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Modal: Añadir hijo */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Añadir hijo</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} disabled={saving}>
                <Ionicons name="close" size={24} color={colors.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={colors.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor={colors.tertiary}
                value={newName}
                onChangeText={setNewName}
                editable={!saving}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="calendar-outline" size={18} color={colors.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Fecha de nacimiento (AAAA-MM-DD)"
                placeholderTextColor={colors.tertiary}
                value={newBirthDate}
                onChangeText={setNewBirthDate}
                editable={!saving}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.genderRow}>
              <TouchableOpacity
                style={[styles.genderBtn, newGender === 'M' && styles.genderActive]}
                onPress={() => setNewGender('M')}
                disabled={saving}
              >
                <Ionicons name="male" size={16} color={newGender === 'M' ? 'white' : colors.tertiary} />
                <Text style={[styles.genderText, newGender === 'M' && styles.genderTextActive]}>
                  Masculino
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBtn, newGender === 'F' && styles.genderActive]}
                onPress={() => setNewGender('F')}
                disabled={saving}
              >
                <Ionicons name="female" size={16} color={newGender === 'F' ? 'white' : colors.tertiary} />
                <Text style={[styles.genderText, newGender === 'F' && styles.genderTextActive]}>
                  Femenino
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.65 }]}
              onPress={handleAddChild}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>Guardar hijo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR Modal */}
      <QRModal visible={!!qrPaciente} onClose={() => setQrPaciente(null)} paciente={qrPaciente} />

      {/* Carnet Upload Modal */}
      {carnetPaciente && (
        <CarnetUploadModal
          visible={!!carnetPaciente}
          onClose={() => setCarnetPaciente(null)}
          idPaciente={carnetPaciente.id_paciente}
          nombrePaciente={carnetPaciente.nombre_completo}
        />
      )}

      {/* Modal permiso de ubicación */}
      <Modal visible={showLocationModal} transparent animationType="fade">
        <View style={styles.locOverlay}>
          <View style={styles.locModal}>
            <View style={styles.locIconWrap}>
              <Ionicons name="location" size={36} color="#6366F1" />
            </View>
            <Text style={styles.locTitle}>¿Podemos usar tu ubicación?</Text>
            <Text style={styles.locDesc}>
              BioSafe usa tu ciudad para darte recomendaciones de salud personalizadas
              según el clima del día: temperatura, lluvia, frío, etc.
            </Text>
            <Text style={styles.locNote}>
              Solo se usa mientras la app está abierta. No almacenamos tu ubicación.
            </Text>
            <TouchableOpacity
              style={styles.locBtnPrimary}
              onPress={() => handleLocationPermission(true)}
            >
              <Ionicons name="location-outline" size={18} color="white" />
              <Text style={styles.locBtnPrimaryText}>Permitir ubicación</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.locBtnSecondary}
              onPress={() => handleLocationPermission(false)}
            >
              <Text style={styles.locBtnSecondaryText}>Ahora no</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, paddingHorizontal: 20 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 10,
  },

  // Mi QR card
  myQrCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myQrLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  myQrAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myQrName: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  myQrSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  myQrActions: { alignItems: 'flex-end' },
  myQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  myQrBtnText: { fontSize: 13, fontWeight: '700', color: '#7e57c2' },

  // Próxima vacuna
  vacunaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  vacunaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vacunaNombre: { fontSize: 15, fontWeight: '700', color: colors.secondary },
  vacunaPara: { fontSize: 12, color: colors.tertiary, marginTop: 2 },
  vacunaDias: { alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  vacunaDiasNum: { fontSize: 22, fontWeight: 'bold', color: colors.secondary },
  vacunaDiasLabel: { fontSize: 10, color: colors.tertiary, marginTop: -2 },

  // Mis Hijos
  hijosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },

  hijoCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  hijoAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(162,128,185,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hijoInfo: { flex: 1 },
  hijoNombre: { fontSize: 15, fontWeight: '700', color: colors.secondary },
  hijoEdad: { fontSize: 12, color: colors.tertiary, marginTop: 2 },
  hijoAcciones: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: colors.secondary, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: colors.tertiary, textAlign: 'center', marginTop: 4, marginHorizontal: 24, lineHeight: 18 },
  emptyBtn: { marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  // Tips
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 14,
  },
  tipIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  tipTitle: { fontSize: 14, fontWeight: '700', color: colors.secondary, marginBottom: 2 },
  tipDesc: { fontSize: 13, color: colors.tertiary, lineHeight: 18 },

  // Health center
  scanBtn: {
    backgroundColor: colors.secondary,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  scanIconBg: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  scanTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  scanDesc: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statBox: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNum: { fontSize: 26, fontWeight: 'bold', color: colors.secondary, marginTop: 6 },
  statLabel: { fontSize: 12, color: colors.tertiary, marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.secondary },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 12,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: colors.secondary, fontSize: 15 },

  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  genderActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderText: { fontSize: 14, fontWeight: '600', color: colors.tertiary },
  genderTextActive: { color: 'white' },

  saveBtn: {
    backgroundColor: colors.secondary,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // Recomendaciones IA
  recsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 10 },
  climaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  climaBadgeText: { fontSize: 11, color: '#6366F1', fontWeight: '700' },
  climaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  climaDesc: { fontSize: 13, color: '#92400E', flex: 1 },
  recsLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20, justifyContent: 'center' },
  recsLoadingText: { fontSize: 13, color: colors.tertiary },

  // Modal ubicación
  locOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
  },
  locModal: {
    backgroundColor: 'white', borderRadius: 24,
    padding: 28, alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  locIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  locTitle: { fontSize: 20, fontWeight: 'bold', color: '#553b5e', textAlign: 'center', marginBottom: 10 },
  locDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  locNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginBottom: 24, fontStyle: 'italic' },
  locBtnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#6366F1', borderRadius: 16,
    paddingVertical: 15, paddingHorizontal: 28,
    width: '100%', justifyContent: 'center', marginBottom: 10,
  },
  locBtnPrimaryText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  locBtnSecondary: { paddingVertical: 10 },
  locBtnSecondaryText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
});
