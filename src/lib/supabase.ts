import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Try to use SecureStore if available (in dev builds), fall back to AsyncStorage (for Expo Go)
let SecureStore: typeof import('expo-secure-store') | null = null;
try {
  SecureStore = require('expo-secure-store');
  // Test if native module is available
  if (!SecureStore.getItemAsync) {
    SecureStore = null;
  }
} catch {
  SecureStore = null;
}

// Storage adapter for Supabase auth
// Uses SecureStore when available (dev builds), AsyncStorage as fallback (Expo Go)
const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    if (SecureStore) {
      try {
        return await SecureStore.getItemAsync(key);
      } catch {
        // Fall through to AsyncStorage
      }
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    if (SecureStore) {
      try {
        await SecureStore.setItemAsync(key, value);
        return;
      } catch {
        // Fall through to AsyncStorage
      }
    }
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    if (SecureStore) {
      try {
        await SecureStore.deleteItemAsync(key);
        return;
      } catch {
        // Fall through to AsyncStorage
      }
    }
    await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
