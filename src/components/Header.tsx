import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, SafeAreaView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  userName: string;
  userFullName?: string;
  userEmail?: string;
}

export const Header = ({ userName, userFullName, userEmail }: HeaderProps) => {
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await supabase.auth.signOut();
              setShowProfile(false);
              router.replace('/login');
            } catch (e) {
              Alert.alert('Error', 'No se pudo cerrar la sesión.');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  // Inicial del nombre para el avatar
  const initial = (userFullName ?? userName).charAt(0).toUpperCase();

  return (
    <>
      <View style={styles.container}>
        <View style={styles.textContainer}>
          <Text style={styles.greeting}>Hola,</Text>
          <Text style={styles.name}>{userName} 👋</Text>
        </View>
        <TouchableOpacity style={styles.avatarButton} onPress={() => setShowProfile(true)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Modal de perfil */}
      <Modal visible={showProfile} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            {/* Avatar grande */}
            <View style={styles.profileAvatarWrap}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarInitial}>{initial}</Text>
              </View>
            </View>

            {/* Datos */}
            <Text style={styles.profileName}>{userFullName ?? userName}</Text>
            {userEmail ? (
              <Text style={styles.profileEmail}>{userEmail}</Text>
            ) : null}

            {/* Info rows */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="person-outline" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Nombre completo</Text>
                  <Text style={styles.infoValue}>{userFullName ?? userName}</Text>
                </View>
              </View>

              {userEmail ? (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="mail-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Correo electrónico</Text>
                    <Text style={styles.infoValue}>{userEmail}</Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Acciones */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Text style={styles.logoutText}>
                {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowProfile(false)}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
    backgroundColor: colors.background,
  },
  textContainer: { flex: 1 },
  greeting: { fontSize: 14, color: colors.tertiary },
  name: { fontSize: 22, fontWeight: 'bold', color: colors.secondary, marginTop: 2 },

  avatarButton: {
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 20, fontWeight: 'bold', color: 'white' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 24,
  },

  profileAvatarWrap: { alignItems: 'center', marginBottom: 14 },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarInitial: { fontSize: 36, fontWeight: 'bold', color: 'white' },

  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.tertiary,
    textAlign: 'center',
    marginBottom: 24,
  },

  infoSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(162,128,185,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: { fontSize: 11, color: colors.tertiary, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.secondary },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    marginBottom: 10,
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },

  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { color: colors.tertiary, fontSize: 14, fontWeight: '600' },
});
