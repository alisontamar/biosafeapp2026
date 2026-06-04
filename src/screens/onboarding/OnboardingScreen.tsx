import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions,
  TouchableOpacity, FlatList, SafeAreaView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    tagline: 'REGISTRO DIGITAL',
    title: 'Tu Carnet\nDigital',
    description: 'Lleva el historial de vacunas de toda tu familia siempre contigo, de forma segura y organizada.',
    icon: 'card' as const,
    gradientColors: ['#b39ddb', '#7e57c2'] as const,
  },
  {
    id: '2',
    tagline: 'INTELIGENCIA ARTIFICIAL',
    title: 'Alertas\nInteligentes',
    description: 'Nuestra IA detecta brotes epidemiológicos y te avisa antes de que representen un riesgo para tu familia.',
    icon: 'pulse' as const,
    gradientColors: ['#553b5e', '#2D3561'] as const,
  },
  {
    id: '3',
    tagline: 'ACCESO INSTANTÁNEO',
    title: 'Validación\nQR Segura',
    description: 'El personal médico accede al expediente completo en segundos con solo escanear el código QR.',
    icon: 'qr-code' as const,
    gradientColors: ['#26a69a', '#00796b'] as const,
  },
];

export const OnboardingScreen = () => {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const splashFade = useRef(new Animated.Value(0)).current;
  const splashScale = useRef(new Animated.Value(0.4)).current;
  const splashExit = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(splashFade, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(splashScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      ]),
      Animated.delay(1000),
      Animated.timing(splashExit, { toValue: 0, duration: 450, useNativeDriver: true }),
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
    <View style={{ width }}>
      <LinearGradient colors={item.gradientColors} style={styles.slideGradient}>
        <View style={styles.iconOrb}>
          <Ionicons name={item.icon} size={72} color="white" />
        </View>
        <View style={styles.orbRing} />
      </LinearGradient>

      <View style={styles.slideContent}>
        <View style={styles.taglineBadge}>
          <Text style={styles.taglineText}>{item.tagline}</Text>
        </View>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </View>
    </View>
  );

  if (showSplash) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: splashExit }]}>
        <LinearGradient colors={['#b39ddb', '#7e57c2']} style={StyleSheet.absoluteFillObject} />
        <Animated.View style={{ opacity: splashFade, transform: [{ scale: splashScale }], alignItems: 'center' }}>
          <View style={styles.splashIconCircle}>
            <Ionicons name="medkit" size={56} color="#7e57c2" />
          </View>
          <Text style={styles.splashAppName}>BioSafe</Text>
          <Text style={styles.splashTagline}>Tu salud, protegida</Text>
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/login')}>
        <Text style={styles.skipText}>Saltar</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.tertiary} />
      </TouchableOpacity>

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

      <View style={styles.bottomArea}>
        <View style={styles.pagination}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.activeDot]} />
          ))}
        </View>

        <TouchableOpacity style={styles.mainButton} onPress={goToNext} activeOpacity={0.85}>
          <Text style={styles.mainButtonText}>
            {currentIndex === slides.length - 1 ? 'Comenzar' : 'Siguiente'}
          </Text>
          <Ionicons
            name={currentIndex === slides.length - 1 ? 'checkmark-circle' : 'arrow-forward-circle'}
            size={22}
            color="white"
            style={{ marginLeft: 10 }}
          />
        </TouchableOpacity>

        {currentIndex < slides.length - 1 ? (
          <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/login')}>
            <Text style={styles.loginLinkText}>
              ¿Ya tienes cuenta?{'  '}
              <Text style={styles.loginLinkBold}>Inicia sesión</Text>
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/login')}>
            <Text style={styles.loginLinkText}>
              ¿Ya tienes cuenta?{'  '}
              <Text style={styles.loginLinkBold}>Inicia sesión</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashIconCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  splashAppName: {
    fontSize: 44,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1.5,
  },
  splashTagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
    letterSpacing: 0.5,
  },

  container: { flex: 1, backgroundColor: colors.background },

  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 36,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 2,
  },
  skipText: { color: colors.tertiary, fontWeight: '600', fontSize: 13 },

  slideGradient: {
    height: height * 0.46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconOrb: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  orbRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  slideContent: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  taglineBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(162,128,185,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(162,128,185,0.25)',
  },
  taglineText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.8,
  },
  slideTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 12,
    lineHeight: 38,
  },
  slideDescription: {
    fontSize: 15,
    color: colors.tertiary,
    lineHeight: 24,
  },

  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 8 : 20,
    backgroundColor: colors.background,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  activeDot: {
    width: 26,
    backgroundColor: colors.primary,
  },
  mainButton: {
    backgroundColor: colors.secondary,
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 7,
  },
  mainButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  loginLink: { alignItems: 'center', paddingVertical: 14 },
  loginLinkText: { color: colors.tertiary, fontSize: 14 },
  loginLinkBold: { color: colors.primary, fontWeight: '700' },
});
