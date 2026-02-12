import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../src/theme/constants';

export const REFERRAL_STORAGE_KEY = 'pending_referral_code';

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();

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
      
      // Redirect to welcome/signup screen
      router.replace('/(auth)');
    }

    handleInvite();
  }, [code]);

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
