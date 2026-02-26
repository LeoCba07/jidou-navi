import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FriendCard } from '../friends';
import type { Friend } from '../../store/friendsStore';
import { FONT_SIZES, ICON_SIZES } from '../../theme/constants';

const pixelEmptyFriends = require('../../../assets/pixel-empty-friends.png');

interface FriendsSectionProps {
  friends: Friend[];
  pendingRequestCount: number;
  onAddFriend: () => void;
  onRemoveFriend: (friendId: string) => void;
}

export default function FriendsSection({
  friends,
  pendingRequestCount,
  onAddFriend,
  onRemoveFriend,
}: FriendsSectionProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.section}>
      <View style={styles.friendsSectionHeader}>
        <View style={[styles.sectionTitleRow, { marginBottom: 0 }]}>
          <Ionicons name="people-outline" size={ICON_SIZES.sm} color="#3C91E6" style={styles.sectionTitleIcon} />
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('friends.yourFriends')}</Text>
        </View>
        <Pressable
          style={styles.addFriendButton}
          onPress={onAddFriend}
          accessibilityRole="button"
          accessibilityLabel={t('friends.addFriend')}
        >
          <Ionicons name="person-add" size={ICON_SIZES.xs} color="#fff" />
          <Text style={styles.addFriendButtonText}>{t('friends.addFriend')}</Text>
          {pendingRequestCount > 0 && (
            <View style={styles.requestCountBadge}>
              <Text style={styles.requestCountText}>
                {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
      {friends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image source={pixelEmptyFriends} style={styles.emptyImage} />
          <Text style={styles.emptyText}>{t('friends.noFriends')}</Text>
          <Text style={styles.emptySubtext}>{t('friends.noFriendsHint')}</Text>
        </View>
      ) : (
        <View style={styles.friendsList}>
          {friends.slice(0, 3).map((friend) => (
            <FriendCard key={friend.id} friend={friend} onRemove={onRemoveFriend} />
          ))}
          {friends.length > 3 && (
            <Text style={styles.moreFriendsText}>
              {t('friends.andMore', { count: friends.length - 3 })}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitleIcon: {
    marginTop: -2,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter-Bold',
    color: '#2B2B2B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  friendsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3C91E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 2,
  },
  addFriendButtonText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  requestCountBadge: {
    backgroundColor: '#FF4B4B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  requestCountText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter-Bold',
    color: '#fff',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyImage: {
    width: 120,
    height: 120,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter',
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  friendsList: {
    gap: 10,
  },
  moreFriendsText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
});
