// Welcome screen - entry point for unauthenticated users
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SHADOWS, SPACING, BORDER_RADIUS } from '../../src/theme/constants';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>JidouNavi</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <Pressable
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
          </Pressable>

          <Pressable
            style={styles.signupButton}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.signupButtonText}>{t('auth.createAccount')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  logoImage: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: 28,
    fontFamily: FONTS.heading,
    color: COLORS.text,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  buttons: {
    gap: SPACING.md,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.pixel,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primaryDark,
    ...SHADOWS.pixelLarge,
  },
  loginButtonText: {
    fontSize: 15,
    color: 'white',
    fontFamily: FONTS.button,
    letterSpacing: 1,
  },
  signupButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.lg,
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.pixel,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.backgroundDark,
    ...SHADOWS.soft,
  },
  signupButtonText: {
    fontSize: 15,
    color: COLORS.text,
    fontFamily: FONTS.button,
    letterSpacing: 1,
  },
});
