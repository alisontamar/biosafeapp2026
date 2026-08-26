import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';
          if (route.name === 'dashboard')       iconName = 'grid-outline';
          if (route.name === 'establecimientos') iconName = 'business-outline';
          if (route.name === 'usuarios')         iconName = 'people-outline';
          if (route.name === 'perfil')           iconName = 'person-circle-outline';
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
      <Tabs.Screen name="dashboard"            options={{ title: 'Inicio' }} />
      <Tabs.Screen name="establecimientos"     options={{ title: 'Centros' }} />
      <Tabs.Screen name="usuarios"             options={{ title: 'Usuarios' }} />
      <Tabs.Screen name="perfil"               options={{ title: 'Perfil' }} />
      <Tabs.Screen name="create-user"          options={{ href: null }} />
      <Tabs.Screen name="create-establishment" options={{ href: null }} />
      <Tabs.Screen name="catalogo-vacunas"     options={{ href: null }} />
      <Tabs.Screen name="scanner"              options={{ href: null }} />
      <Tabs.Screen name="patient-detail"       options={{ href: null }} />
      <Tabs.Screen name="register-dose"        options={{ href: null }} />
      <Tabs.Screen name="quick-scan"           options={{ href: null }} />
    </Tabs>
  );
}
