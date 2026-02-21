// BadgeShowcase - displays unlocked and locked badges
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FONT_SIZES, COLORS } from '../../theme/constants';
import { Badge, calculateBadgeProgress } from '../../lib/badges';
import LockedBadgeCard from './LockedBadgeCard';
import BadgeSash from './BadgeSash';
import type { UserBadge } from './EarnedBadgeRow';

const pixelEmptyBadges = require('../../../assets/pixel-empty-badges.png');

interface BadgeShowcaseProps {
  earnedBadges: UserBadge[];
  allBadges: Badge[];
  userStats: {
    visit_count: number;
    contribution_count: number;
    verification_count: number;
  };
  onLockedBadgePress: (badge: Badge, progress: { current: number; required: number }) => void;
  onEarnedBadgePress: (badge: UserBadge['badge']) => void;
  onViewAll: () => void;
}

export default function BadgeShowcase({
  earnedBadges,
  allBadges,
  userStats,
  onLockedBadgePress,
  onEarnedBadgePress,
  onViewAll,
}: BadgeShowcaseProps) {
  const { t } = useTranslation();

  // Get IDs of earned badges
  const earnedBadgeIds = new Set(earnedBadges.map((ub) => ub.badge.id));

  // Separate locked badges
  const lockedBadges = allBadges.filter((b) => !earnedBadgeIds.has(b.id));
  const lockedPreview = lockedBadges.slice(0, 3);

  // No badges exist at all
  if (allBadges.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Image source={pixelEmptyBadges} style={styles.emptyImage} />
        <Text style={styles.emptyText}>{t('profile.noBadgesYet')}</Text>
        <Text style={styles.emptySubtext}>{t('profile.badgesHint')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Unlocked badges section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>
            {t('profile.unlockedBadges')} ({earnedBadges.length})
          </Text>
        </View>
        {earnedBadges.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>{t('profile.noBadgesYet')}</Text>
          </View>
        ) : (
          <BadgeSash 
            badges={earnedBadges} 
            onBadgePress={onEarnedBadgePress} 
            onSashPress={onViewAll} 
          />
        )}
      </View>

      {/* Locked badges section */}
      {lockedBadges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {t('profile.lockedBadges')} ({lockedBadges.length})
          </Text>
          <View style={styles.lockedPreviewGrid}>
            {lockedPreview.map((badge) => {
              const progress = calculateBadgeProgress(badge, userStats);
              return (
                <LockedBadgeCard
                  key={badge.id}
                  badge={badge}
                  progress={progress.percent}
                  onPress={() =>
                    onLockedBadgePress(badge, {
                      current: progress.current,
                      required: progress.required,
                    })
                  }
                />
              );
            })}
            {lockedBadges.length > 3 && (
              <Pressable 
                style={styles.moreLockedButton} 
                onPress={onViewAll}
                accessibilityRole="button"
                accessibilityLabel={t('badges.viewAll')}
              >
                <Text style={styles.moreLockedText}>...</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  section: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Silkscreen',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgesScroll: {
    gap: 12,
  },
  lockedPreviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  moreLockedButton: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  moreLockedText: {
    fontSize: 16,
    fontFamily: 'Silkscreen',
    color: COLORS.textLight,
    marginTop: -8, // Vertical alignment for dots
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
  },
  emptyImage: {
    width: 120,
    height: 120,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Silkscreen',
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter',
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  emptySection: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: COLORS.textLight,
  },
});
