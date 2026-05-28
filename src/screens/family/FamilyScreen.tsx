import React from 'react'
import { View, Text, StyleSheet, FlatList } from 'react-native'

const DATA = [{ id: '1', name: 'Niño A' }, { id: '2', name: 'Niño B' }]

export default function FamilyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Familia</Text>
      <FlatList data={DATA} keyExtractor={(i) => i.id} renderItem={({ item }) => <Text>{item.name}</Text>} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
})
