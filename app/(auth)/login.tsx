// Login screen
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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useAppModal } from '../../src/hooks/useAppModal';
import { COLORS, FONTS, SHADOWS, SPACING, BORDER_RADIUS } from '../../src/theme/constants';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showError } = useAppModal();

  async function handleLogin() {
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
    if (!password) {
      showError(t('common.error'), t('auth.validation.enterPassword'));
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      showError(t('auth.errors.loginFailed'), error.message);
    }
    // On success, the auth listener in _layout.tsx will redirect
  }

  return (
    <View style={styles.container}>
      {/* Decorative pixel corners */}
      <View style={styles.cornerTopLeft} />
      <View style={styles.cornerTopRight} />
      <View style={styles.cornerBottomLeft} />
      <View style={styles.cornerBottomRight} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Logo / Title */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.logo}>JidouNavi</Text>
            <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
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

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor={COLORS.textLight}
                  secureTextEntry={!showPassword}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.textLight}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={styles.forgotLink}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
            </Pressable>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.login')}</Text>
              )}
            </Pressable>
          </View>

          {/* Sign up link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.dontHaveAccount')}</Text>
            <Pressable onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.linkText}>{t('auth.signup')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
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
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoContainer: {
    width: 100,
    height: 100,
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
    width: 80,
    height: 80,
  },
  logo: {
    fontSize: 20,
    fontFamily: FONTS.heading,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
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
    marginBottom: SPACING.lg,
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
  eyeButton: {
    padding: SPACING.xs,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.xxl,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: FONTS.button,
    color: COLORS.secondary,
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
    fontSize: 15,
    color: 'white',
    fontFamily: FONTS.button,
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  footerText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.button,
  },
});
