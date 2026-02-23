import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image } from 'react-native';
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

  async function handleResendEmail() {
    if (!user?.email) return;
    
    setIsResending(true);
    setMessage(null);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) throw error;
      setMessage(t('auth.verifyEmail.sentAgain'));
    } catch (error: any) {
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

  // Poll for confirmation status (optional, users usually click the link and the app refreshes via listener)
  async function checkStatus() {
    const { data: { user: updatedUser } } = await supabase.auth.getUser();
    if (updatedUser?.email_confirmed_at) {
      setUser(updatedUser);
      router.replace('/(tabs)');
    } else {
      setMessage(t('auth.verifyEmail.stillNotVerified'));
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
          <View style={styles.messageBanner}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}

        <Pressable 
          style={styles.primaryButton} 
          onPress={checkStatus}
        >
          <Text style={styles.primaryButtonText}>{t('auth.verifyEmail.iConfirmed', "I've confirmed my email")}</Text>
        </Pressable>

        <Pressable 
          style={[styles.secondaryButton, isResending && styles.disabledButton]} 
          onPress={handleResendEmail}
          disabled={isResending}
        >
          {isResending ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Text style={styles.secondaryButtonText}>{t('auth.verifyEmail.resend', 'Resend link')}</Text>
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
    backgroundColor: '#FDF3E7', // Match app theme
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
  messageText: {
    color: '#166534',
    textAlign: 'center',
    fontFamily: FONTS.bodyMedium,
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
