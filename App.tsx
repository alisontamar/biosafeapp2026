import React from 'react'
import { SafeAreaView, StyleSheet, Text } from 'react-native'
import AppNavigator from './src/navigation/AppNavigator'

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <AppNavigator />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({ container: { flex: 1 } })
