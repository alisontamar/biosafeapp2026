import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Bell, QrCode } from 'lucide-react-native';
import { Colors } from '@/constants/colors';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    icon: Shield,
    title: 'Tu carnet digital\nsiempre contigo',
    description: 'Accede al historial de vacunación completo de tu familia desde cualquier lugar, en cualquier momento.',
  },
  {
    icon: Bell,
    title: 'Alertas preventivas\ncon IA',
    description: 'Nuestra inteligencia artificial analiza los riesgos epidemiológicos de tu zona y te notifica a tiempo.',
  },
  {
    icon: QrCode,
    title: 'Validación rápida\npor QR',
    description: 'Muestra el código QR al personal médico para validar el historial de vacunación al instante.',
  },
];

interface Props {
  onFinish: () => void;
}

export default function OnboardingScreen({ onFinish }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goToNext = () => {
    if (currentIndex < slides.length - 1) {
      const next = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setCurrentIndex(next);
    } else {
      onFinish();
    }
  };

  const handleScroll = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  return (
    <LinearGradient colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]} style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          <Shield color={Colors.primary} size={28} strokeWidth={2.5} />
        </View>
        <Text style={styles.logoText}>BioSafe</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {slides.map((slide, index) => {
          const IconComponent = slide.icon;
          return (
            <View key={index} style={styles.slide}>
              <View style={styles.iconWrapper}>
                <IconComponent color={Colors.white} size={64} strokeWidth={1.5} />
              </View>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideDescription}>{slide.description}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={goToNext} activeOpacity={0.85}>
          <Text style={styles.btnText}>
            {currentIndex === slides.length - 1 ? 'Comenzar' : 'Siguiente'}
          </Text>
        </TouchableOpacity>

        {currentIndex < slides.length - 1 && (
          <TouchableOpacity onPress={onFinish} style={styles.skip}>
            <Text style={styles.skipText}>Omitir</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 64,
    gap: 10,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  scroll: {
    flex: 1,
    marginTop: 24,
  },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 32,
  },
  iconWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 16,
  },
  slideDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
  },
  bottom: {
    width: '100%',
    paddingHorizontal: 32,
    paddingBottom: 48,
    alignItems: 'center',
    gap: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.white,
  },
  btn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary,
  },
  skip: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
});
