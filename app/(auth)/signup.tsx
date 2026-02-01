// Sign up screen
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
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useAppModal } from '../../src/hooks/useAppModal';
import CountryPicker from '../../src/components/CountryPicker';
import { Country, getCountryByCode } from '../../src/lib/countries';
import { COLORS, FONTS, SHADOWS, SPACING, BORDER_RADIUS } from '../../src/theme/constants';

export default function SignupScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const { showError, showSuccess } = useAppModal();

  async function handleSignup() {
    // Validation
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
    if (!username.trim()) {
      showError(t('common.error'), t('auth.validation.enterUsername'));
      return;
    }
    if (username.trim().length < 3) {
      showError(t('common.error'), t('auth.validation.usernameMinLength'));
      return;
    }
    if (!password) {
      showError(t('common.error'), t('auth.validation.enterPassword'));
      return;
    }
    if (password.length < 6) {
      showError(t('common.error'), t('auth.validation.passwordMinLength'));
      return;
    }
    if (password !== confirmPassword) {
      showError(t('common.error'), t('auth.validation.passwordsNoMatch'));
      return;
    }
    if (!country) {
      showError(t('common.error'), t('auth.validation.selectCountry'));
      return;
    }

    setLoading(true);

    // Create auth user
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: username.trim(),
          country: country,
        },
      },
    });

    if (error) {
      setLoading(false);
      showError(t('auth.errors.signupFailed'), error.message);
      return;
    }

    // Profile is created automatically by database trigger on auth.users

    setLoading(false);
    showSuccess(
      t('auth.accountCreated.title'),
      t('auth.accountCreated.message'),
      () => router.replace('/(auth)/login')
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Back button */}
      <Pressable
        style={[styles.backButton, { top: insets.top + 12 }]}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)')}
        hitSlop={12}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logo}>Jidou Navi</Text>
            <Text style={styles.subtitle}>{t('auth.createYourAccount')}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.username')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder={t('auth.usernamePlaceholder')}
                  placeholderTextColor={COLORS.textLight}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.country')}</Text>
              <Pressable
                style={styles.inputContainer}
                onPress={() => setShowCountryPicker(true)}
                accessibilityRole="button"
                accessibilityLabel={t('auth.selectCountry')}
              >
                <Ionicons name="flag-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                {country ? (
                  <View style={styles.selectedCountry}>
                    <Text style={styles.countryFlag}>{getCountryByCode(country)?.flag}</Text>
                    <Text style={styles.countryName}>{getCountryByCode(country)?.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.placeholder}>{t('auth.selectCountry')}</Text>
                )}
                <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
              </Pressable>
            </View>

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

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  placeholderTextColor={COLORS.textLight}
                  secureTextEntry={!showConfirmPassword}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                  accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.textLight}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.createAccount')}</Text>
              )}
            </Pressable>
          </View>

          {/* Login link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.alreadyHaveAccount')}</Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.linkText}>{t('auth.login')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <CountryPicker
        visible={showCountryPicker}
        selectedCountry={country}
        onSelect={(selectedCountry: Country) => setCountry(selectedCountry.code)}
        onClose={() => setShowCountryPicker(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: SPACING.sm,
  },
  backButton: {
    position: 'absolute',
    left: SPACING.lg,
    zIndex: 10,
    padding: SPACING.sm,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 60,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  logoImage: {
    width: 170,
    height: 170,
  },
  logo: {
    fontSize: 25,
    fontFamily: FONTS.heading,
    color: COLORS.text,
    marginBottom: SPACING.md,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    paddingBottom: SPACING.sm,
  },
  form: {
    marginBottom: SPACING.xl,
  },
  field: {
    marginBottom: SPACING.md,
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
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.text,
  },
  selectedCountry: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: SPACING.sm,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryName: {
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.text,
  },
  placeholder: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
  },
  eyeButton: {
    padding: SPACING.xs,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.pixel,
    alignItems: 'center',
    marginTop: SPACING.sm,
    borderWidth: 3,
    borderColor: COLORS.primaryDark,
    ...SHADOWS.pixelLarge,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
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
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
  linkText: {
    fontSize: 15,
    color: COLORS.primary,
    fontFamily: FONTS.button,
  },
});
