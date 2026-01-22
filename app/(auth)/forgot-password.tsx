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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useAppModal } from '../../src/hooks/useAppModal';

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
        <View style={styles.content}>
          <View style={styles.successIcon}>
            <Ionicons name="mail-outline" size={48} color="#FF4B4B" />
          </View>
          <Text style={styles.successTitle}>{t('auth.checkYourEmail')}</Text>
          <Text style={styles.successText}>
            {t('auth.resetEmailSent', { email })}
          </Text>
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
      <View style={styles.content}>
        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#2B2B2B" />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('auth.forgotPasswordTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.forgotPasswordSubtitle')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.email')}</Text>
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
    backgroundColor: '#FDF3E7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 20,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    color: '#666',
    lineHeight: 22,
  },
  form: {
    marginBottom: 24,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter',
    color: '#2B2B2B',
  },
  button: {
    backgroundColor: '#FF4B4B',
    paddingVertical: 14,
    borderRadius: 2,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#CC3C3C',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
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
  // Success state
  successIcon: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 60,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
    textAlign: 'center',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    fontFamily: 'Inter',
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
});
