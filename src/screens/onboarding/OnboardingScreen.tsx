import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions,
  TouchableOpacity, FlatList, Image, Platform, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

// ─── Paleta onboarding ────────────────────────────────────────────
// Fondo sólido lila (el principal de la app). Sin degradados.
const BG       = '#7e5a9b';   // fondo de pantalla
const BG_BLOB  = '#8f6aac';   // óvalo suave detrás de la ilustración
const WHITE    = '#ffffff';
const WHITE60  = 'rgba(255,255,255,0.60)';
const WHITE20  = 'rgba(255,255,255,0.20)';

// ─── Slides ───────────────────────────────────────────────────────
const slides = [
  {
    id: '1',
    image: require('../../../assets/images/onboarding/slide1.png'),
    title: 'Tu Carnet\nDigital',
    description: 'Lleva el historial de vacunas de toda tu familia siempre contigo, de forma segura y organizada.',
  },
  {
    id: '2',
    image: require('../../../assets/images/onboarding/slide2.png'),
    title: 'Alertas\nInteligentes',
    description: 'Nuestra IA detecta brotes epidemiológicos y te avisa antes de que representen un riesgo para tu familia.',
  },
  {
    id: '3',
    image: require('../../../assets/images/onboarding/slide3.png'),
    title: 'Validación\nQR Segura',
    description: 'El personal médico accede al expediente en segundos escaneando el código QR.',
  },
];

// ─── Componente ───────────────────────────────────────────────────
export const OnboardingScreen = () => {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const splashFade  = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.5)).current;
  const splashExit  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(splashFade,  { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(splashScale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      ]),
      Animated.delay(900),
      Animated.timing(splashExit, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setShowSplash(false));
  }, []);

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToOffset({ offset: next * width, animated: true });
      setCurrentIndex(next);
    } else {
      router.replace('/login');
    }
  };

  const renderSlide = ({ item }: { item: typeof slides[0] }) => (
    <View style={[styles.slide, { width }]}>
      {/* Óvalo detrás de la ilustración */}
      <View style={styles.blob} />

      {/* Ilustración */}
      <Image source={item.image} style={styles.illustration} resizeMode="contain" />

      {/* Texto */}
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  );

  // ─── Splash ───────────────────────────────────────────────────
  if (showSplash) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: splashExit }]}>
        <StatusBar barStyle="light-content" backgroundColor={BG} />
        <Animated.View style={[
          styles.splashInner,
          { opacity: splashFade, transform: [{ scale: splashScale }] },
        ]}>
          <View style={styles.splashIconCircle}>
            <Ionicons name="medkit" size={44} color={WHITE} />
          </View>
          <Text style={styles.splashName}>BioSafe</Text>
          <Text style={styles.splashSub}>Tu salud, protegida</Text>
        </Animated.View>
      </Animated.View>
    );
  }

  // ─── Onboarding ───────────────────────────────────────────────
  const isLast = currentIndex === slides.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Logo arriba a la izquierda */}
      <View style={styles.logoRow}>
        <View style={styles.logoIconCircle}>
          <Ionicons name="medkit" size={16} color={WHITE} />
        </View>
        <Text style={styles.logoText}>BioSafe</Text>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
      />

      {/* Bottom: dots + navegación */}
      <View style={styles.bottomArea}>
        {/* Dots */}
        <View style={styles.pagination}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.activeDot]} />
          ))}
        </View>

        {/* Skip / Next */}
        <View style={styles.navRow}>
          {!isLast ? (
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.skipText}>Saltar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.replace('/login')}>
              <Text style={styles.skipText}>¿Ya tienes cuenta?</Text>
            </TouchableOpacity>
          )}

          {isLast ? (
            <TouchableOpacity style={styles.startButton} onPress={goToNext} activeOpacity={0.85}>
              <Text style={styles.startButtonText}>Comenzar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.nextButton} onPress={goToNext} activeOpacity={0.75}>
              <Text style={styles.nextText}>Siguiente</Text>
              <Ionicons name="arrow-forward" size={16} color={WHITE} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ── Splash ──────────────────────────────────────────────────────
  splashContainer: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashInner: { alignItems: 'center' },
  splashIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: WHITE20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  splashName: {
    fontSize: 38,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: 0.5,
  },
  splashSub: {
    fontSize: 15,
    color: WHITE60,
    marginTop: 6,
  },

  // ── Contenedor ──────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight ?? 24) + 12,
  },

  // ── Logo ────────────────────────────────────────────────────────
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 8,
  },
  logoIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: WHITE20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: WHITE,
    letterSpacing: 0.3,
  },

  // ── Slide ────────────────────────────────────────────────────────
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  blob: {
    position: 'absolute',
    top: height * 0.04,
    width: width * 0.72,
    height: width * 0.72,
    borderRadius: (width * 0.72) / 2,
    backgroundColor: BG_BLOB,
  },
  illustration: {
    width: width * 0.78,
    height: height * 0.38,
    marginBottom: 32,
  },
  slideTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: WHITE,
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  slideDescription: {
    fontSize: 14,
    color: WHITE60,
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── Bottom ───────────────────────────────────────────────────────
  bottomArea: {
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: WHITE20,
  },
  activeDot: {
    width: 26,
    backgroundColor: WHITE,
    borderRadius: 4,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    color: WHITE60,
    fontSize: 14,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  nextText: {
    color: WHITE,
    fontWeight: '700',
    fontSize: 15,
  },
  startButton: {
    backgroundColor: WHITE,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 28,
  },
  startButtonText: {
    color: BG,
    fontWeight: '800',
    fontSize: 16,
  },
});
