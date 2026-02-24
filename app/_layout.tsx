// Root layout - handles auth state and routing
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { initSentry } from '../src/lib/sentry';

// Initialize Sentry as early as possible
initSentry();
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { DotGothic16_400Regular } from '@expo-google-fonts/dotgothic16';
import { Silkscreen_400Regular, Silkscreen_700Bold } from '@expo-google-fonts/silkscreen';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { I18nextProvider } from 'react-i18next';
import i18n, { initI18n } from '../src/lib/i18n';
import { supabase } from '../src/lib/supabase';
import { Analytics } from '../src/lib/analytics';
import { useAuthStore } from '../src/store/authStore';
import { useSavedMachinesStore } from '../src/store/savedMachinesStore';
import { useVisitedMachinesStore } from '../src/store/visitedMachinesStore';
import { useLanguageStore } from '../src/store/languageStore';
import { fetchSavedMachineIds, fetchVisitedMachineIds } from '../src/lib/machines';
import BadgeUnlockModal from '../src/components/BadgeUnlockModal';
import AppModal from '../src/components/AppModal';
import Toast from '../src/components/Toast';
import LanguageSelector from '../src/components/LanguageSelector';
import ShareableCard from '../src/components/ShareableCard';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { registerForPushNotificationsAsync } from '../src/lib/notifications';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, setUser, setSession, setProfile, isLoading, setLoading } = useAuthStore();
  const { setSavedMachineIds } = useSavedMachinesStore();
  const { setVisitedMachineIds } = useVisitedMachinesStore();
  const { initializeLanguage } = useLanguageStore();
  const [isReady, setIsReady] = useState(false);
  const [i18nReady, setI18nReady] = useState(false);

  const [fontsLoaded] = useFonts({
    PressStart2P: PressStart2P_400Regular, // Branding / Logo
    Inter: Inter_400Regular,               // Body text
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,           // Section titles
    DotGothic16: DotGothic16_400Regular,  // Page titles
    Silkscreen: Silkscreen_400Regular,     // UI elements, buttons
    'Silkscreen-Bold': Silkscreen_700Bold,
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
        loadVisitedMachines();
        // Track app_open for authenticated user
        Analytics.track('app_open');
        // Register for push notifications
        registerForPushNotificationsAsync();
      }
      setLoading(false);
      setIsReady(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // If email is confirmed, proceed with profile and data loading
          if (currentUser.email_confirmed_at) {
            fetchProfile(currentUser.id, currentUser.email);
            loadSavedMachines();
            loadVisitedMachines();
            registerForPushNotificationsAsync();
            
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
              Analytics.track('app_open');
            }
          }
        } else {
          setProfile(null);
          setSavedMachineIds([]);
          setVisitedMachineIds([]);
        }
      }
    );

    // Notification listener
    let notificationListener: any;
    try {
      const Notifications = require('expo-notifications');
      const ALLOWED_ROUTE_PREFIXES = ['/machine/', '/(tabs)', '/profile/'];

      notificationListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const rawUrl = response.notification.request.content.data?.url;
        if (rawUrl && typeof rawUrl === 'string') {
          // Normalize URL: ensure it starts with /, remove query/hash, prevent path traversal
          let url = rawUrl.split(/[?#]/)[0];
          if (!url.startsWith('/')) url = '/' + url;
          
          const isAllowed = 
            url.startsWith('/machine/') || 
            url.startsWith('/profile/') || 
            ['/(tabs)', '/(tabs)/', '/(auth)', '/(auth)/'].includes(url);

          const hasTraversal = url.includes('..') || url.includes('%2e');

          if (isAllowed && !hasTraversal) {
            router.push(url as any);
          } else {
            console.warn('Blocked deep link with unrecognized or unsafe route:', rawUrl);
          }
        }
      });
    } catch (e) {
      console.warn('Could not initialize notification listeners:', e);
    }

    return () => {
      subscription.unsubscribe();
      if (notificationListener) {
        notificationListener.remove();
      }
    };
  }, []);

  // Load saved machines for the current user
  async function loadSavedMachines() {
    const ids = await fetchSavedMachineIds();
    setSavedMachineIds(ids);
  }

  // Load visited machines for the current user
  async function loadVisitedMachines() {
    const ids = await fetchVisitedMachineIds();
    setVisitedMachineIds(ids);
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
      const defaultName = userEmail?.split('@')[0] || 'user';
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: defaultName,
          display_name: defaultName,
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
    const isVerifyingEmail = segments[1] === 'verify-email';

    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)');
      }
    } else if (!user.email_confirmed_at) {
      // Logged in but not verified
      if (!isVerifyingEmail) {
        router.replace('/(auth)/verify-email');
      }
    } else if (inAuthGroup || isVerifyingEmail) {
      // Logged in and verified, but still in auth group
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
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
        <BadgeUnlockModal />
        <AppModal />
        <Toast />
        <LanguageSelector />
        <ShareableCard />
      </I18nextProvider>
    </ErrorBoundary>
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
