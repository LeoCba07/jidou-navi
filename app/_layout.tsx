// Root layout - handles auth state and routing
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n } from '../src/lib/i18n';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/store/authStore';
import { useSavedMachinesStore } from '../src/store/savedMachinesStore';
import { useLanguageStore } from '../src/store/languageStore';
import { fetchSavedMachineIds } from '../src/lib/machines';
import BadgeUnlockModal from '../src/components/BadgeUnlockModal';
import AppModal from '../src/components/AppModal';
import LanguageSelector from '../src/components/LanguageSelector';
import ShareableCard from '../src/components/ShareableCard';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, setUser, setSession, setProfile, isLoading, setLoading } = useAuthStore();
  const { setSavedMachineIds } = useSavedMachinesStore();
  const { initializeLanguage } = useLanguageStore();
  const [isReady, setIsReady] = useState(false);
  const [i18nReady, setI18nReady] = useState(false);

  const [fontsLoaded] = useFonts({
    PressStart2P: PressStart2P_400Regular,
    Inter: Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  // Initialize i18n
  useEffect(() => {
    initI18n().then(() => {
      initializeLanguage();
      setI18nReady(true);
    });
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
        loadSavedMachines();
      }
      setLoading(false);
      setIsReady(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id, session.user.email);
          loadSavedMachines();
        } else {
          setProfile(null);
          setSavedMachineIds([]); // Clear saved machines on logout
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Load saved machines for the current user
  async function loadSavedMachines() {
    const ids = await fetchSavedMachineIds();
    setSavedMachineIds(ids);
  }

  // Fetch user profile from database (creates one if missing)
  async function fetchProfile(userId: string, userEmail?: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setProfile(data);
      return;
    }

    // Profile doesn't exist - create one (safety net for edge cases)
    if (error?.code === 'PGRST116') { // "Row not found" error
      const username = userEmail?.split('@')[0] || 'user';
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: username,
          contribution_count: 0,
          visit_count: 0,
          badge_count: 0,
        })
        .select()
        .single();

      if (!createError && newProfile) {
        setProfile(newProfile);
      } else {
        console.error('Failed to create missing profile:', createError);
      }
    }
  }

  // Handle routing based on auth state
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Not logged in, redirect to login
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Logged in, redirect to main app
      router.replace('/(tabs)');
    }
  }, [user, segments, isReady]);

  // Show loading screen while checking auth, loading fonts, or initializing i18n
  if (!isReady || isLoading || !fontsLoaded || !i18nReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF4B4B" />
      </View>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
      <BadgeUnlockModal />
      <AppModal />
      <LanguageSelector />
      <ShareableCard />
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF3E7',
  },
});
