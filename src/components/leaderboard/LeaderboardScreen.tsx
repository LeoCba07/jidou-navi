// Leaderboard section component for Discover screen
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useFriendsStore } from '../../store/friendsStore';
import { useAuthStore } from '../../store/authStore';
import LeaderboardToggle, { LeaderboardType } from './LeaderboardToggle';
import LeaderboardRow from './LeaderboardRow';

export default function LeaderboardScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [activeType, setActiveType] = useState<LeaderboardType>('global');

  const {
    globalLeaderboard,
    friendsLeaderboard,
    isLoadingLeaderboard,
    loadGlobalLeaderboard,
    loadFriendsLeaderboard,
  } = useFriendsStore();

  // Load leaderboard data
  useEffect(() => {
    if (user) {
      loadGlobalLeaderboard();
      loadFriendsLeaderboard();
    }
  }, [user]);

  // Reload when switching tabs
  useEffect(() => {
    if (user && activeType === 'global') {
      loadGlobalLeaderboard();
    } else if (user && activeType === 'friends') {
      loadFriendsLeaderboard();
    }
  }, [activeType, user]);

  const currentLeaderboard = activeType === 'global' ? globalLeaderboard : friendsLeaderboard;

  // Show empty state for friends leaderboard if only user
  const showNoFriendsState = activeType === 'friends' && currentLeaderboard.length <= 1;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="trophy" size={20} color="#D97706" />
          <Text style={styles.title}>{t('leaderboard.title')}</Text>
        </View>
        <LeaderboardToggle activeType={activeType} onToggle={setActiveType} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isLoadingLeaderboard ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#FF4B4B" />
          </View>
        ) : showNoFriendsState ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={32} color="#ccc" />
            <Text style={styles.emptyText}>{t('leaderboard.noFriendsYet')}</Text>
          </View>
        ) : currentLeaderboard.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={32} color="#ccc" />
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
    fontSize: 13,
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
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
