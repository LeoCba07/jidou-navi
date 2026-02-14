// Leaderboard section component for Discover screen
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { FONT_SIZES, ICON_SIZES } from '../../theme/constants';
const pixelEmptyFriends = require('../../../assets/pixel-empty-friends.png');
import { useTranslation } from 'react-i18next';
import { useFriendsStore } from '../../store/friendsStore';
import { useAuthStore } from '../../store/authStore';
import LeaderboardToggle, { LeaderboardType } from './LeaderboardToggle';
import LeaderboardRow from './LeaderboardRow';

export default function LeaderboardScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [activeType, setActiveType] = useState<LeaderboardType>('global');
  const [isLoading, setIsLoading] = useState(true);

  const {
    globalLeaderboard,
    friendsLeaderboard,
    loadGlobalLeaderboard,
    loadFriendsLeaderboard,
  } = useFriendsStore();

  // Load both leaderboards on mount
  useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([loadGlobalLeaderboard(), loadFriendsLeaderboard()])
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [user]);

  // Handle tab switch
  function handleToggle(type: LeaderboardType) {
    setActiveType(type);

    // Refresh the selected tab's data
    if (type === 'global') {
      loadGlobalLeaderboard();
    } else {
      loadFriendsLeaderboard();
    }
  }

  const currentLeaderboard = activeType === 'global' ? globalLeaderboard : friendsLeaderboard;

  // Show empty state for friends leaderboard if only user or empty
  const showNoFriendsState = activeType === 'friends' && currentLeaderboard.length <= 1;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="trophy" size={ICON_SIZES.sm} color="#D97706" />
          <Text style={styles.title}>{t('leaderboard.title')}</Text>
        </View>
        <LeaderboardToggle activeType={activeType} onToggle={handleToggle} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#FF4B4B" />
          </View>
        ) : showNoFriendsState ? (
          <View style={styles.emptyState}>
            <Image source={pixelEmptyFriends} style={styles.emptyImage} />
            <Text style={styles.emptyText}>{t('leaderboard.noFriendsYet')}</Text>
          </View>
        ) : currentLeaderboard.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={ICON_SIZES.lg} color="#ccc" />
            <Text style={styles.emptyText}>{t('leaderboard.noData')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {currentLeaderboard.map((entry) => (
              <LeaderboardRow key={entry.user_id} entry={entry} showWeeklyXp />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter-Bold',
    color: '#2B2B2B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    minHeight: 100,
  },
  loader: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 1,
    backgroundColor: '#eee',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyImage: {
    width: 120,
    height: 120,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
