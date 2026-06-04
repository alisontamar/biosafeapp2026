import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase. Revisa tu archivo .env en la raíz del proyecto de React Native.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Cliente sin persistencia para crear usuarios sin cerrar la sesión del admin actual
const memoryStorage = {
  getItem: (_key: string) => Promise.resolve(null),
  setItem: (_key: string, _value: string) => Promise.resolve(),
  removeItem: (_key: string) => Promise.resolve(),
};

export function createTempClient() {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      storage: memoryStorage,
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
