import { useRef, useImperativeHandle, forwardRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MAX_DAILY_UPVOTES } from '../../lib/upvotes';

const HEART_ICON = require('../../../assets/pixel-ui-heart.png');

type DailyVotesIndicatorProps = {
  remainingVotes: number;
  compact?: boolean;
};

export interface DailyVotesIndicatorRef {
  shake: () => void;
}

const DailyVotesIndicator = forwardRef<DailyVotesIndicatorRef, DailyVotesIndicatorProps>(({
  remainingVotes,
  compact = false,
}, ref) => {
  const { t } = useTranslation();
  const usedVotes = MAX_DAILY_UPVOTES - remainingVotes;
  const hasVotesLeft = remainingVotes > 0;

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useImperativeHandle(ref, () => ({
    shake: () => {
      // Stop and reset to ensure deterministic start
      shakeAnim.stopAnimation();
      scaleAnim.stopAnimation();
      shakeAnim.setValue(0);
      scaleAnim.setValue(1);

      // Parallel animation: scale up/down and shake side-to-side
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ])
      ]).start();
    }
  }));

  const animatedStyle = {
    transform: [
      { translateX: shakeAnim },
      { scale: scaleAnim }
    ]
  };

  if (compact) {
    return (
      <Animated.View style={[styles.compactContainer, !hasVotesLeft && styles.compactContainerEmpty, animatedStyle]}>
        <Image
          source={HEART_ICON}
          style={{ width: 12, height: 12, opacity: hasVotesLeft ? 1 : 0.3 }}
        />
        <Text style={[styles.compactText, !hasVotesLeft && styles.compactTextEmpty]}>
          {remainingVotes}/{MAX_DAILY_UPVOTES}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.iconRow}>
        {Array.from({ length: MAX_DAILY_UPVOTES }).map((_, index) => (
          <Image
            key={index}
            source={HEART_ICON}
            style={{ width: 16, height: 16, opacity: index < usedVotes ? 0.25 : 1 }}
          />
        ))}
      </View>
      <Text style={[styles.text, !hasVotesLeft && styles.textEmpty]}>
        {hasVotesLeft
          ? t('discover.votesRemaining', { count: remainingVotes })
          : t('discover.noVotesLeft')}
      </Text>
    </Animated.View>
  );
});

export default DailyVotesIndicator;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 2,
  },
  text: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#D97706',
  },
  textEmpty: {
    color: '#999',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  compactContainerEmpty: {
    backgroundColor: '#f0f0f0',
  },
  compactText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FF4B4B',
  },
  compactTextEmpty: {
    color: '#999',
  },
});
