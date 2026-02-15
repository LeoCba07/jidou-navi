// Leaderboard row component
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FONT_SIZES, ICON_SIZES } from '../../theme/constants';
import type { LeaderboardEntry } from '../../store/friendsStore';
import UserAvatar from '../UserAvatar';

const MEDAL_ICONS: Record<number, any> = {
  1: require('../../../assets/pixel-medal-gold.png'),
  2: require('../../../assets/pixel-medal-silver.png'),
  3: require('../../../assets/pixel-medal-bronze.png'),
};

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  showWeeklyXp?: boolean;
}

function getRankIcon(rank: number): React.ReactNode {
  if (rank <= 3) {
    return <Image source={MEDAL_ICONS[rank]} style={{ width: 22, height: 22 }} />;
  }
  return <Text style={styles.rankNumber}>{rank}</Text>;
}

function getRankColor(rank: number): string {
  if (rank === 1) return '#FFD700'; // Gold
  if (rank === 2) return '#C0C0C0'; // Silver
  if (rank === 3) return '#CD7F32'; // Bronze
  return 'transparent';
}

export default function LeaderboardRow({ entry, showWeeklyXp = false }: LeaderboardRowProps) {
  const isTopThree = entry.rank <= 3;
  const rankColor = getRankColor(entry.rank);

  function handlePress() {
    router.push(`/profile/${entry.user_id}`);
  }

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.container,
        entry.is_current_user && styles.currentUser,
        isTopThree && { borderLeftWidth: 4, borderLeftColor: rankColor },
      ]}
    >
      <View style={[styles.rankContainer, isTopThree && { backgroundColor: rankColor + '20' }]}>
        {getRankIcon(entry.rank)}
      </View>
      <UserAvatar
        url={entry.avatar_url}
        size={36}
        borderWidth={entry.is_current_user ? 2 : 1}
        borderColor={entry.is_current_user ? '#FF4B4B' : '#ddd'}
        style={styles.avatar}
      />
      <View style={styles.info}>
        <Text style={[styles.name, entry.is_current_user && styles.currentUserName]} numberOfLines={1}>
          {entry.display_name || entry.username}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Lv.{entry.level}</Text>
          </View>
          <Text style={styles.xpText}>{entry.xp.toLocaleString()} XP</Text>
        </View>
      </View>
      {showWeeklyXp && entry.xp_this_week > 0 && (
        <View style={styles.weeklyXp}>
          <Ionicons name="trending-up" size={ICON_SIZES.xs} color="#22C55E" />
          <Text style={styles.weeklyXpText}>+{entry.xp_this_week}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#eee',
  },
  currentUser: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FF4B4B',
    borderWidth: 2,
  },
  rankContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    marginRight: 8,
  },
  rankNumber: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    marginBottom: 2,
  },
  currentUserName: {
    color: '#FF4B4B',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    backgroundColor: '#2B2B2B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 2,
  },
  levelText: {
    fontSize: FONT_SIZES.xxs,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
  xpText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter',
    color: '#666',
  },
  weeklyXp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  weeklyXpText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter-SemiBold',
    color: '#22C55E',
  },
});
