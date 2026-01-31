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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useAppModal } from '../../src/hooks/useAppModal';
import CountryPicker from '../../src/components/CountryPicker';
import { Country, getCountryByCode } from '../../src/lib/countries';

export default function SignupScreen() {
  const { t } = useTranslation();
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="storefront-outline" size={48} color="#FF4B4B" />
            </View>
            <Text style={styles.logo}>JidouNavi</Text>
            <Text style={styles.subtitle}>{t('auth.createYourAccount')}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.username')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder={t('auth.usernamePlaceholder')}
                  placeholderTextColor="#999"
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
                <Ionicons name="flag-outline" size={20} color="#999" style={styles.inputIcon} />
                {country ? (
                  <View style={styles.selectedCountry}>
                    <Text style={styles.countryFlag}>{getCountryByCode(country)?.flag}</Text>
                    <Text style={styles.countryName}>{getCountryByCode(country)?.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.placeholder}>{t('auth.selectCountry')}</Text>
                )}
                <Ionicons name="chevron-down" size={20} color="#999" />
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.email')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('auth.emailPlaceholder')}
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('auth.passwordPlaceholder')}
                  placeholderTextColor="#999"
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
                    color="#999"
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  placeholderTextColor="#999"
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
                    color="#999"
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
            <Pressable onPress={() => router.back()}>
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
    backgroundColor: '#FDF3E7',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 60,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 4,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FF4B4B',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  logo: {
    fontSize: 18,
    fontFamily: 'PressStart2P',
    color: '#2B2B2B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    color: '#666',
  },
  form: {
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter',
    color: '#2B2B2B',
  },
  selectedCountry: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryName: {
    fontSize: 16,
    fontFamily: 'Inter',
    color: '#2B2B2B',
  },
  placeholder: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter',
    color: '#999',
  },
  eyeButton: {
    padding: 4,
  },
  button: {
    backgroundColor: '#FF4B4B',
    paddingVertical: 16,
    borderRadius: 2,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 3,
    borderColor: '#CC3C3C',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 15,
    color: 'white',
    fontFamily: 'Silkscreen',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#666',
  },
  linkText: {
    fontSize: 14,
    color: '#FF4B4B',
    fontFamily: 'Silkscreen',
  },
});
