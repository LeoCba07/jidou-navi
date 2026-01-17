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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useAppModal } from '../../src/hooks/useAppModal';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
        {/* Logo / Title */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="storefront-outline" size={48} color="#FF4B4B" />
          </View>
          <Text style={styles.logo}>JidouNavi</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
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
                secureTextEntry
              />
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
    backgroundColor: '#FDF3E7',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 14,
    color: '#3C91E6',
  },
  button: {
    backgroundColor: '#FF4B4B',
    paddingVertical: 16,
    borderRadius: 2,
    alignItems: 'center',
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
    fontSize: 17,
    color: 'white',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
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
    fontFamily: 'Inter-SemiBold',
  },
});
