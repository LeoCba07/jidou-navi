// BadgeShowcase - displays unlocked and locked badges with rarity filters
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Badge } from '../../lib/badges';
import LockedBadgeCard from './LockedBadgeCard';

// Badge type from joined query (user's earned badges)
type UserBadge = {
  id: string;
  unlocked_at: string;
  badge: {
    id: string;
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

type RarityFilter = 'all' | 'common' | 'rare' | 'epic';

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
    // category_visit and verification_count would need additional data
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
  const [activeFilter, setActiveFilter] = useState<RarityFilter>('all');

  // Get IDs of earned badges
  const earnedBadgeIds = new Set(earnedBadges.map((ub) => ub.badge.id));

  // Separate locked badges
  const lockedBadges = allBadges.filter((b) => !earnedBadgeIds.has(b.id));

  // Filter by rarity
  const filterByRarity = <T extends { rarity?: string | null }>(items: T[]): T[] => {
    if (activeFilter === 'all') return items;
    return items.filter((item) => (item.rarity || 'common') === activeFilter);
  };

  const filteredEarned = filterByRarity(
    earnedBadges.map((ub) => ({ ...ub, rarity: ub.badge.rarity }))
  );
  const filteredLocked = filterByRarity(lockedBadges);

  const filters: { key: RarityFilter; label: string }[] = [
    { key: 'all', label: t('profile.filterAll') },
    { key: 'common', label: t('profile.filterCommon') },
    { key: 'rare', label: t('profile.filterRare') },
    { key: 'epic', label: t('profile.filterEpic') },
  ];

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterTabs}>
        {filters.map((filter) => (
          <Pressable
            key={filter.key}
            style={[
              styles.filterTab,
              activeFilter === filter.key && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter.key && styles.filterTabTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Unlocked badges section */}
      {filteredEarned.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {t('profile.unlockedBadges')} ({filteredEarned.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesScroll}
          >
            {filteredEarned.map((userBadge) => (
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
                onPress={() => onEarnedBadgePress(userBadge.badge)}
              >
                {userBadge.badge.icon_url ? (
                  <Image
                    source={{ uri: userBadge.badge.icon_url }}
                    style={styles.badgeIcon}
                  />
                ) : (
                  <View style={styles.badgeIconPlaceholder}>
                    <Ionicons name="trophy" size={24} color="#FF4B4B" />
                  </View>
                )}
                <Text style={styles.badgeName} numberOfLines={1}>
                  {userBadge.badge.name}
                </Text>
                <Text style={styles.badgeDescription} numberOfLines={2}>
                  {userBadge.badge.description}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Locked badges section */}
      {filteredLocked.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {t('profile.lockedBadges')} ({filteredLocked.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesScroll}
          >
            {filteredLocked.map((badge) => {
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

      {/* Empty state */}
      {filteredEarned.length === 0 && filteredLocked.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>{t('profile.noBadgesYet')}</Text>
          <Text style={styles.emptySubtext}>{t('profile.badgesHint')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 2,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: '#FF4B4B',
    borderColor: '#2B2B2B',
  },
  filterTabText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgesScroll: {
    gap: 12,
  },
  badgeItem: {
    width: 110,
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
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  badgeIconPlaceholder: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 10,
    fontFamily: 'Inter',
    color: '#999',
    textAlign: 'center',
    lineHeight: 13,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
});
