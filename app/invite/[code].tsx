import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../src/theme/constants';
import { useAuthStore } from '../../src/store/authStore';

export const REFERRAL_STORAGE_KEY = 'pending_referral_code';

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { user } = useAuthStore();

  useEffect(() => {
    async function handleInvite() {
      if (code) {
        console.log('[Referral] Capturing code:', code);
        try {
          await AsyncStorage.setItem(REFERRAL_STORAGE_KEY, code);
        } catch (e) {
          console.error('[Referral] Error saving code:', e);
        }
      }
      
      // If already logged in, go to home, otherwise go to auth
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)');
      }
    }

    handleInvite();
  }, [code, user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF3E7',
  },
});
