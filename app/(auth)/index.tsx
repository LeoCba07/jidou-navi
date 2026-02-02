// Welcome screen - entry point for unauthenticated users
import { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Button from '../../src/components/Button';
import { COLORS, FONTS, SPACING } from '../../src/theme/constants';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
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
          <Button
            title={t('auth.login')}
            onPress={() => router.push('/(auth)/login')}
            variant="primary"
          />

          {/* OR divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title={t('auth.createAccount')}
            onPress={() => router.push('/(auth)/signup')}
            variant="secondary"
          />
        </View>
      </Animated.View>
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
});
