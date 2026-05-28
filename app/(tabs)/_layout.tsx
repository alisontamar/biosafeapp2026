import React from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function TabsLayout() {
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap = 'home'

        if (route.name === 'home') iconName = 'home-outline'
        if (route.name === 'family') iconName = 'people-outline'
        if (route.name === 'education') iconName = 'school-outline'
        if (route.name === 'alerts') iconName = 'notifications-outline'
        if (route.name === 'qr') iconName = 'qr-code-outline'

        return <Ionicons name={iconName} size={size} color={color} />
      },
      tabBarActiveTintColor: '#0a84ff',
      tabBarInactiveTintColor: '#8e8e99',
      tabBarStyle: { backgroundColor: '#ffffff', borderTopWidth: 0.5, borderTopColor: '#e5e7eb' },
    })}
    />
  )
}
