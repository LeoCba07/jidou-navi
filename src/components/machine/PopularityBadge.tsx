// Small pill showing popularity tier based on visit count
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FONTS, SPACING, BORDER_RADIUS } from '../../theme/constants';

type PopularityTier = 'hidden_gem' | 'discovered' | 'rising' | 'popular' | 'legendary';

type TierConfig = {
  emoji: string;
  color: string;
  backgroundColor: string;
  translationKey: string;
};

const TIER_CONFIG: Record<PopularityTier, TierConfig> = {
  hidden_gem: {
    emoji: '💎',
    color: '#6366F1',
    backgroundColor: '#EEF2FF',
    translationKey: 'machine.popularity.hiddenGem',
  },
  discovered: {
    emoji: '🔍',
    color: '#0891B2',
    backgroundColor: '#ECFEFF',
    translationKey: 'machine.popularity.discovered',
  },
  rising: {
    emoji: '📈',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    translationKey: 'machine.popularity.rising',
  },
  popular: {
    emoji: '🔥',
    color: '#EA580C',
    backgroundColor: '#FFF7ED',
    translationKey: 'machine.popularity.popular',
  },
  legendary: {
    emoji: '⭐',
    color: '#CA8A04',
    backgroundColor: '#FEFCE8',
    translationKey: 'machine.popularity.legendary',
  },
};

function getPopularityTier(visitCount: number): PopularityTier {
  if (visitCount >= 100) return 'legendary';
  if (visitCount >= 50) return 'popular';
  if (visitCount >= 20) return 'rising';
  if (visitCount >= 5) return 'discovered';
  return 'hidden_gem';
}

type PopularityBadgeProps = {
  visitCount: number;
};

export function PopularityBadge({ visitCount }: PopularityBadgeProps) {
  const { t } = useTranslation();
  const tier = getPopularityTier(visitCount);
  const config = TIER_CONFIG[tier];

  return (
    <View style={[styles.container, { backgroundColor: config.backgroundColor }]}>
      <Text style={styles.emoji}>{config.emoji}</Text>
      <Text style={[styles.text, { color: config.color }]}>
        {t(config.translationKey)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    gap: SPACING.xs,
  },
  emoji: {
    fontSize: 12,
  },
  text: {
    fontSize: 10,
    fontFamily: FONTS.bodySemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
