import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HealthTabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
          if (route.name === 'dashboard') iconName = 'grid-outline';
          if (route.name === 'scanner')   iconName = 'scan-outline';
          if (route.name === 'pacientes') iconName = 'people-outline';
          if (route.name === 'perfil')    iconName = 'person-circle-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#a281ba',
        tabBarInactiveTintColor: '#8e8e99',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0.5,
          borderTopColor: '#e5e7eb',
        },
      })}
    >
      <Tabs.Screen name="dashboard"       options={{ title: 'Inicio' }} />
      <Tabs.Screen name="scanner"         options={{ title: 'Escanear' }} />
      <Tabs.Screen name="pacientes"       options={{ title: 'Pacientes' }} />
      <Tabs.Screen name="perfil"          options={{ title: 'Perfil' }} />
      <Tabs.Screen name="patient-detail"  options={{ href: null }} />
      <Tabs.Screen name="register-dose"   options={{ href: null }} />
      <Tabs.Screen name="quick-scan"      options={{ href: null }} />
    </Tabs>
  );
}
