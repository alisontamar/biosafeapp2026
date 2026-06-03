import React from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline'
          if (route.name === 'home')      iconName = 'home-outline'
          if (route.name === 'family')    iconName = 'people-outline'
          if (route.name === 'education') iconName = 'school-outline'
          if (route.name === 'alerts')    iconName = 'notifications-outline'
          if (route.name === 'qr')        iconName = 'qr-code-outline'
          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: '#a280b9',
        tabBarInactiveTintColor: '#8e8e99',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0.5,
          borderTopColor: '#e5e7eb',
        },
      })}
    >
      <Tabs.Screen name="home"      options={{ title: 'Inicio' }} />
      <Tabs.Screen name="family"    options={{ title: 'Familia' }} />
      <Tabs.Screen name="education" options={{ title: 'Educación' }} />
      <Tabs.Screen name="alerts"    options={{ title: 'Alertas' }} />
      <Tabs.Screen name="qr"        options={{ title: 'Mi QR' }} />
      {/* Ruta de detalle: accesible por navegación, invisible en la barra */}
      <Tabs.Screen name="family/[id]" options={{ href: null }} />
    </Tabs>
  )
}
