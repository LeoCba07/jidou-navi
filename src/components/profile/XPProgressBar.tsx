import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getLevelProgress } from '../../lib/xp';
import { FONT_SIZES } from '../../theme/constants';

function getLevelTierColor(level: number): string {
  if (level >= 20) return '#F59E0B';
  if (level >= 15) return '#8B5CF6';
  if (level >= 10) return '#3B82F6';
  if (level >= 5) return '#22C55E';
  return '#6B7280';
}

function getLevelTierBorderColor(level: number): string {
  if (level >= 20) return '#D97706';
  if (level >= 15) return '#7C3AED';
  if (level >= 10) return '#2563EB';
  if (level >= 5) return '#16A34A';
  return '#4B5563';
}

interface XPProgressBarProps {
  xp: number;
}

export default function XPProgressBar({ xp }: XPProgressBarProps) {
  const { t } = useTranslation();
  const progress = getLevelProgress(xp);
  const rawPercentage = Number(progress?.percentage);
  const safePercentage = Number.isFinite(rawPercentage)
    ? Math.min(100, Math.max(0, rawPercentage))
    : 0;

  const fillAnim = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      fillAnim.setValue(0);
      Animated.timing(fillAnim, {
        toValue: safePercentage,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(fillAnim, {
        toValue: safePercentage,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
  }, [safePercentage]);

  const tierColor = getLevelTierColor(progress.currentLevel);
  const tierBorderColor = getLevelTierBorderColor(progress.currentLevel);
  const xpToNext = Math.ceil(progress.xpForNextLevel - progress.currentXP);

  const animatedWidth = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.xpSection}>
      <View style={[styles.levelBadge, { backgroundColor: tierColor, borderColor: tierBorderColor }]}>
        <Text style={styles.levelText}>{t('profile.level')} {progress.currentLevel}</Text>
      </View>
      <View style={styles.xpBarContainer}>
        <Animated.View style={[styles.xpBarFill, { width: animatedWidth }]} />
        <Text style={styles.xpText}>
          {Math.floor(progress.currentXP)} / {Math.floor(progress.xpForNextLevel)} XP
        </Text>
      </View>
      <Text style={styles.xpToNext}>
        {t('profile.xpToNext', { xp: xpToNext })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  xpSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 2,
    marginBottom: 8,
    borderWidth: 1,
  },
  levelText: {
    color: '#fff',
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Silkscreen',
  },
  xpBarContainer: {
    width: '100%',
    height: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#2B2B2B',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#22C55E',
  },
  xpText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Silkscreen',
    color: '#2B2B2B',
    lineHeight: 20,
  },
  xpToNext: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#999',
    marginTop: 4,
  },
});
