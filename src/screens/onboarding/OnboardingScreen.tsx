// src/screens/onboarding/OnboardingScreen.tsx

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Animated, Dimensions, 
  TouchableOpacity, FlatList, SafeAreaView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

const slides = [
  { 
    id: '1', 
    title: 'Carnet Digital', 
    description: 'Lleva el registro de vacunas de tu familia siempre contigo y actualizado.', 
    icon: 'card-outline' 
  },
  { 
    id: '2', 
    title: 'Alertas con IA', 
    description: 'Recibe notificaciones inteligentes sobre brotes y próximas vacunas.', 
    icon: 'pulse-outline' 
  },
  { 
    id: '3', 
    title: 'Validación QR', 
    description: 'Acceso rápido y seguro a los expedientes en cualquier centro de salud.', 
    icon: 'qr-code-outline' 
  },
];

export const OnboardingScreen = () => {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Animaciones para el Splash
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Secuencia de Splash: Fade In + Escala
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true })
    ]).start(() => {
      // Ocultar splash después de 2.5 segundos totales
      setTimeout(() => setShowSplash(false), 1000);
    });
  }, []);

  const renderSlide = ({ item }: any) => (
    <View style={styles.slide}>
      <Ionicons name={item.icon} size={100} color={colors.primary} />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          {/* Aquí puedes reemplazar con tu <Image> del logo de BioSafe */}
          <Ionicons name="medkit" size={120} color={colors.primary} />
          <Text style={styles.splashText}>BioSafe</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        keyExtractor={(item) => item.id}
      />
      
      {/* Puntos del carrusel */}
      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <View 
            key={index} 
            style={[styles.dot, currentIndex === index && styles.activeDot]} 
          />
        ))}
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => router.replace('/login')} // Va al flujo de autenticación
      >
        <Text style={styles.buttonText}>
          {currentIndex === slides.length - 1 ? 'Comenzar' : 'Siguiente'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  splashContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  splashText: { fontSize: 40, fontWeight: 'bold', color: colors.secondary, marginTop: 20 },
  container: { flex: 1, backgroundColor: colors.background },
  slide: { width, alignItems: 'center', justifyContent: 'center', padding: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.secondary, marginTop: 40, textAlign: 'center' },
  description: { fontSize: 16, color: colors.tertiary, textAlign: 'center', marginTop: 20, lineHeight: 24 },
  pagination: { flexDirection: 'row', justifyContent: 'center', marginBottom: 40 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surface, marginHorizontal: 5 },
  activeDot: { backgroundColor: colors.primary, width: 20 },
  button: { backgroundColor: colors.primary, marginHorizontal: 40, padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 40 },
  buttonText: { color: colors.background, fontSize: 18, fontWeight: 'bold' },
});