// Shared earned badge horizontal row used by own profile and other user profiles
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { FONT_SIZES } from '../../theme/constants';
import { useBadgeTranslation } from '../../hooks/useBadgeTranslation';
import { getBadgeImage } from '../../lib/badge-images';

const pixelStatBadges = require('../../../assets/pixel-stat-badges.png');

// Badge type from joined query (user's earned badges)
export type UserBadge = {
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

// Rarity colors for badge borders
const RARITY_COLORS: Record<string, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#8B5CF6',
};

interface EarnedBadgeRowProps {
  badges: UserBadge[];
  onBadgePress: (badge: { name: string; description: string; slug: string; id: string; icon_url: string | null; rarity: string | null }) => void;
}

export default function EarnedBadgeRow({ badges, onBadgePress }: EarnedBadgeRowProps) {
  const { getBadgeTranslation } = useBadgeTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.badgesScroll}
    >
      {badges.map((userBadge) => {
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
            onPress={() => onBadgePress({ ...userBadge.badge, name: translation.name, description: translation.description })}
          >
            {userBadge.badge.icon_url ? (
              <Image
                source={{ uri: userBadge.badge.icon_url }}
                style={styles.badgeIcon}
              />
            ) : getBadgeImage(userBadge.badge.slug) ? (
              <Image
                source={getBadgeImage(userBadge.badge.slug)}
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
  );
}

const styles = StyleSheet.create({
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
  badgeName: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    textAlign: 'center',
  },
});
