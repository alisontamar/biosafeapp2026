import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

type Props = { title?: string }

export default function Header({ title }: Props) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title || 'Biosafe'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: '700' },
})
