import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'

type Props = { onPress?: () => void }

export default function FloatingQRButton({ onPress }: Props) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>QR</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    backgroundColor: '#0a84ff',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#fff', fontWeight: '700' },
})
