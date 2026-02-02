// Forgot password screen
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useAppModal } from '../../src/hooks/useAppModal';
import Button from '../../src/components/Button';
import { COLORS, FONTS, SHADOWS, SPACING, BORDER_RADIUS } from '../../src/theme/constants';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { showError } = useAppModal();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
        <Animated.View
          style={[
            styles.successContent,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.successIconContainer}>
            <Ionicons name="mail-outline" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.successTitle}>{t('auth.checkYourEmail')}</Text>
          <Text style={styles.successText}>
            {t('auth.resetEmailSent', { email })}
          </Text>

          <Button
            title={t('auth.backToLogin')}
            onPress={() => router.replace('/(auth)/login')}
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back button */}
      <Pressable
        style={[styles.backButton, { top: insets.top + 12 }]}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/login')}
        hitSlop={12}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </Pressable>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Header with logo */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.title}>{t('auth.forgotPasswordTitle')}</Text>
            <Text style={styles.subtitle}>
              {t('auth.forgotPasswordSubtitle')}
            </Text>
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

            <Button
              title={t('auth.sendResetLink')}
              onPress={handleReset}
              loading={loading}
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    position: 'absolute',
    left: SPACING.lg,
    zIndex: 10,
    padding: SPACING.sm,
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
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 20,
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
  form: {
    marginBottom: SPACING.xxl,
  },
  field: {
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
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
    fontSize: 20,
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
