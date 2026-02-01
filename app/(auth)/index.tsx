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
          <Text style={styles.title}>Jidou Navi</Text>
          <Text style={styles.subtitle}>{t('auth.welcomeMessage')}</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <Pressable
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
          </Pressable>

          {/* OR divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

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
    width: 220,
    height: 220,
  },
  title: {
    fontSize: 25,
    fontFamily: FONTS.heading,
    color: COLORS.text,
    letterSpacing: 1,
    marginBottom: SPACING.xl,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.textLight,
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
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
    fontSize: 16,
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
    fontSize: 16,
    color: COLORS.text,
    fontFamily: FONTS.button,
    letterSpacing: 1,
  },
});
