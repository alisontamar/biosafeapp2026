import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export default function ChildDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detalle del niño</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700' },
})
