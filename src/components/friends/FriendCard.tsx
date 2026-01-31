// Friend list item component
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Friend } from '../../store/friendsStore';

const DEFAULT_AVATAR = require('../../../assets/default-avatar.jpg');

interface FriendCardProps {
  friend: Friend;
  onRemove: (friendId: string) => void;
}

export default function FriendCard({ friend, onRemove }: FriendCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Image
        source={friend.avatar_url ? { uri: friend.avatar_url } : DEFAULT_AVATAR}
        style={styles.avatar}
      />
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.displayName} numberOfLines={1}>
            {friend.display_name || friend.username}
          </Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Lv.{friend.level}</Text>
          </View>
        </View>
        <Text style={styles.username}>@{friend.username}</Text>
      </View>
      <Pressable
        style={styles.removeButton}
        onPress={() => onRemove(friend.id)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('friends.remove')}
      >
        <Ionicons name="person-remove-outline" size={18} color="#999" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 2,
    padding: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FF4B4B',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  displayName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    flex: 1,
  },
  levelBadge: {
    backgroundColor: '#2B2B2B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
  },
  levelText: {
    fontSize: 10,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
  username: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#999',
  },
  removeButton: {
    padding: 8,
  },
});
