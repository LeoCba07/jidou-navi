// Forgot password screen
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useAppModal } from '../../src/hooks/useAppModal';
import { COLORS, FONTS, SHADOWS, SPACING, BORDER_RADIUS } from '../../src/theme/constants';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { showError } = useAppModal();

  async function handleReset() {
    if (!email.trim()) {
      showError(t('common.error'), t('auth.validation.enterEmail'));
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showError(t('common.error'), t('auth.validation.validEmail'));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);

    if (error) {
      showError(t('common.error'), error.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <View style={styles.container}>
        {/* Decorative pixel corners */}
        <View style={styles.cornerTopLeft} />
        <View style={styles.cornerTopRight} />
        <View style={styles.cornerBottomLeft} />
        <View style={styles.cornerBottomRight} />

        <View style={styles.successContent}>
          <View style={styles.successIconContainer}>
            <Ionicons name="mail-outline" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.successTitle}>{t('auth.checkYourEmail')}</Text>
          <Text style={styles.successText}>
            {t('auth.resetEmailSent', { email })}
          </Text>

          {/* Decorative divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerDot} />
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={styles.button}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.buttonText}>{t('auth.backToLogin')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Decorative pixel corners */}
      <View style={styles.cornerTopLeft} />
      <View style={styles.cornerTopRight} />
      <View style={styles.cornerBottomLeft} />
      <View style={styles.cornerBottomRight} />

      <View style={styles.content}>
        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <View style={styles.backButtonInner}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </View>
        </Pressable>

        {/* Header with logo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>{t('auth.forgotPasswordTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.forgotPasswordSubtitle')}
          </Text>
        </View>

        {/* Decorative divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerDot} />
          <View style={styles.dividerLine} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.email')}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.emailPlaceholder')}
                placeholderTextColor={COLORS.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.sendResetLink')}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Decorative pixel corners
  cornerTopLeft: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.primary,
    zIndex: 10,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 24,
    height: 24,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.primary,
    zIndex: 10,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.primary,
    zIndex: 10,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 24,
    height: 24,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.primary,
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xxl,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: SPACING.xxl,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.pixel,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.backgroundDark,
    ...SHADOWS.pixel,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.pixel,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 4,
    borderColor: COLORS.primary,
    ...SHADOWS.pixelLarge,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.title,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  // Decorative divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    paddingHorizontal: SPACING.xxxl,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.primaryDark,
  },
  dividerDot: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.sm,
  },
  form: {
    marginBottom: SPACING.xxl,
  },
  field: {
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: 13,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 3,
    borderColor: COLORS.backgroundDark,
    borderRadius: BORDER_RADIUS.pixel,
    paddingHorizontal: SPACING.md,
    ...SHADOWS.soft,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.pixel,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primaryDark,
    ...SHADOWS.pixelLarge,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    color: 'white',
    fontFamily: FONTS.button,
    letterSpacing: 1,
  },
  // Success state
  successContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.pixel,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.xxl,
    borderWidth: 4,
    borderColor: COLORS.primary,
    ...SHADOWS.pixelLarge,
  },
  successTitle: {
    fontSize: 18,
    fontFamily: FONTS.title,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  successText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
    lineHeight: 20,
    paddingHorizontal: SPACING.lg,
  },
});
