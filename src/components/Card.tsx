import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

type Props = { title?: string; children?: React.ReactNode }

export default function Card({ title, children }: Props) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  title: { fontWeight: '700', marginBottom: 8 },
})
