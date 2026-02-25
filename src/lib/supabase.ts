import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const getEnv = (name: string): string => {
  const value = process.env?.[name];
  if (!value) {
    throw new Error(
      `Required environment variable "${name}" is not set. ` +
        'Please ensure it is configured (for example in your .env file or build environment).',
    );
  }
  return value;
};

const supabaseUrl = getEnv('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

// Session expiry: JWT lifetime is configured server-side in Supabase Dashboard
// (Settings → Auth → JWT expiry). autoRefreshToken handles silent renewal.
// When refresh fails (e.g. account deleted, token revoked), Supabase emits
// SIGNED_OUT which is caught by the auth listener in _layout.tsx to clear
// state and redirect to the auth screen.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Re-export helper types from generated database.types for full compatibility
export type { Tables, TablesInsert, TablesUpdate, Enums } from './database.types';
