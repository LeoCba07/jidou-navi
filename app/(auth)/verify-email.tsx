import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, FONT_SIZES } from '../../src/theme/constants';
import { Ionicons } from '@expo/vector-icons';

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const { user, setUser, setSession, setProfile } = useAuthStore();
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [cooldown, setCooldown] = useState(0);

  // Handle cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleResendEmail() {
    if (!user?.email || cooldown > 0) return;
    
    setIsResending(true);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) throw error;
      setMessageType('success');
      setMessage(t('auth.verifyEmail.sentAgain'));
      setCooldown(60); // 60 seconds cooldown
    } catch (error: any) {
      setMessageType('error');
      setMessage(error.message || t('common.error'));
    } finally {
      setIsResending(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    router.replace('/(auth)');
  }

  // Poll for confirmation status
  async function checkStatus() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const updatedUser = data?.user;
      if (updatedUser?.email_confirmed_at) {
        // Use refreshSession to trigger global auth listener in RootLayout
        // which loads profile, saved machines, etc.
        await supabase.auth.refreshSession();
        router.replace('/(tabs)');
      } else {
        setMessageType('error');
        setMessage(t('auth.verifyEmail.stillNotVerified'));
      }
    } catch (error: any) {
      setMessageType('error');
      setMessage(error.message || t('common.error'));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-unread-outline" size={80} color={COLORS.primary} />
        </View>
        
        <Text style={styles.title}>{t('auth.verifyEmail.title', 'Confirm your email')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.verifyEmail.subtitle', 'We sent a confirmation link to:')}
        </Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.card}>
          <Text style={styles.instruction}>
            {t('auth.verifyEmail.instruction', 'Please check your inbox and click the link to activate your account.')}
          </Text>
        </View>

        {message && (
          <View style={[
            styles.messageBanner,
            messageType === 'error' && styles.messageBannerError
          ]}>
            <Text style={[
              styles.messageText,
              messageType === 'error' && styles.messageTextError
            ]}>{message}</Text>
          </View>
        )}

        <Pressable 
          style={styles.primaryButton} 
          onPress={checkStatus}
        >
          <Text style={styles.primaryButtonText}>{t('auth.verifyEmail.iConfirmed', "I've confirmed my email")}</Text>
        </Pressable>

        <Pressable 
          style={[
            styles.secondaryButton, 
            (isResending || cooldown > 0) && styles.disabledButton
          ]} 
          onPress={handleResendEmail}
          disabled={isResending || cooldown > 0}
        >
          {isResending ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.secondaryButtonText}>
              {cooldown > 0 
                ? `${t('auth.verifyEmail.resend')} (${cooldown}s)` 
                : t('auth.verifyEmail.resend')}
            </Text>
          )}
        </Pressable>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('auth.logout', 'Log Out')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF3E7',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontFamily: FONTS.title,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  email: {
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.primary,
    marginBottom: SPACING.xl,
  },
  card: {
    backgroundColor: '#fff',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.pixel,
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
    ...SHADOWS.pixel,
    width: '100%',
    marginBottom: SPACING.xl,
  },
  instruction: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.body,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  messageBanner: {
    backgroundColor: '#DCFCE7',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
    width: '100%',
  },
  messageBannerError: {
    backgroundColor: '#FEE2E2',
  },
  messageText: {
    color: '#166534',
    textAlign: 'center',
    fontFamily: FONTS.bodyMedium,
  },
  messageTextError: {
    color: '#991B1B',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    width: '100%',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.pixel,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.pixel,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.button,
  },
  secondaryButton: {
    width: '100%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.pixel,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: SPACING.xl,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.button,
  },
  disabledButton: {
    opacity: 0.5,
  },
  logoutButton: {
    marginTop: SPACING.xl,
  },
  logoutText: {
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
    fontFamily: FONTS.body,
  },
});
