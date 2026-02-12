// BadgeShowcase - displays unlocked and locked badges
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Badge } from '../../lib/badges';
import LockedBadgeCard from './LockedBadgeCard';
import { useBadgeTranslation } from '../../hooks/useBadgeTranslation';

const pixelEmptyBadges = require('../../../assets/pixel-empty-badges.png');
const pixelStatBadges = require('../../../assets/pixel-stat-badges.png');

// Badge type from joined query (user's earned badges)
type UserBadge = {
  id: string;
  unlocked_at: string;
  badge: {
    id: string;
    slug: string;
    name: string;
    description: string;
    icon_url: string | null;
    rarity: string | null;
  };
};

interface BadgeShowcaseProps {
  earnedBadges: UserBadge[];
  allBadges: Badge[];
  userStats: {
    visit_count: number;
    contribution_count: number;
  };
  onLockedBadgePress: (badge: Badge, progress: { current: number; required: number }) => void;
  onEarnedBadgePress: (badge: UserBadge['badge']) => void;
}

// Rarity colors for badge borders
const RARITY_COLORS: Record<string, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#8B5CF6',
};

function calculateBadgeProgress(
  badge: Badge,
  userStats: { visit_count: number; contribution_count: number }
): { current: number; required: number; percent: number } {
  const required = badge.trigger_value?.count || 0;
  let current = 0;

  switch (badge.trigger_type) {
    case 'visit_count':
      current = userStats.visit_count;
      break;
    case 'contribution_count':
      current = userStats.contribution_count;
      break;
    default:
      current = 0;
  }

  const percent = required > 0 ? Math.min((current / required) * 100, 100) : 0;
  return { current, required, percent };
}

export default function BadgeShowcase({
  earnedBadges,
  allBadges,
  userStats,
  onLockedBadgePress,
  onEarnedBadgePress,
}: BadgeShowcaseProps) {
  const { t } = useTranslation();
  const { getBadgeTranslation } = useBadgeTranslation();

  // Get IDs of earned badges
  const earnedBadgeIds = new Set(earnedBadges.map((ub) => ub.badge.id));

  // Separate locked badges
  const lockedBadges = allBadges.filter((b) => !earnedBadgeIds.has(b.id));

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
        <Text style={styles.sectionLabel}>
          {t('profile.unlockedBadges')} ({earnedBadges.length})
        </Text>
        {earnedBadges.length === 0 ? (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>{t('profile.noBadgesYet')}</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesScroll}
          >
            {earnedBadges.map((userBadge) => {
              const translation = getBadgeTranslation(
                userBadge.badge.slug,
                userBadge.badge.name,
                userBadge.badge.description
              );
              return (
                <Pressable
                  key={userBadge.id}
                  style={[
                    styles.badgeItem,
                    {
                      borderColor:
                        RARITY_COLORS[userBadge.badge.rarity || 'common'] ||
                        RARITY_COLORS.common,
                    },
                  ]}
                  onPress={() => onEarnedBadgePress({ ...userBadge.badge, name: translation.name, description: translation.description })}
                >
                  {userBadge.badge.icon_url ? (
                    <Image
                      source={{ uri: userBadge.badge.icon_url }}
                      style={styles.badgeIcon}
                    />
                  ) : (
                    <Image
                      source={pixelStatBadges}
                      style={styles.badgeIcon}
                    />
                  )}
                  <Text style={styles.badgeName} numberOfLines={1}>
                    {translation.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Locked badges section */}
      {lockedBadges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {t('profile.lockedBadges')} ({lockedBadges.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesScroll}
          >
            {lockedBadges.map((badge) => {
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
          </ScrollView>
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
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Silkscreen',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgesScroll: {
    gap: 12,
  },
  badgeItem: {
    width: 100,
    backgroundColor: '#fff',
    borderRadius: 2,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 2,
  },
  badgeIcon: {
    width: 42,
    height: 42,
    marginBottom: 8,
  },
  badgeIconPlaceholder: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    textAlign: 'center',
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
    fontSize: 14,
    fontFamily: 'Silkscreen',
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  emptySection: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#999',
  },
});
