// User search result component
import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { UserSearchResult as UserSearchResultType } from '../../store/friendsStore';

const DEFAULT_AVATAR = require('../../../assets/default-avatar.jpg');

interface UserSearchResultProps {
  user: UserSearchResultType;
  onSendRequest: (userId: string) => Promise<{ success: boolean; autoAccepted?: boolean; error?: string }>;
}

export default function UserSearchResult({ user, onSendRequest }: UserSearchResultProps) {
  const { t } = useTranslation();
  const [isSending, setIsSending] = useState(false);
  const [localStatus, setLocalStatus] = useState(user.friendship_status);

  // Sync local status with prop changes
  useEffect(() => {
    setLocalStatus(user.friendship_status);
  }, [user.friendship_status]);

  async function handleSendRequest() {
    if (localStatus !== 'none' || isSending) return;

    setIsSending(true);
    try {
      const result = await onSendRequest(user.id);
      if (result.success) {
        setLocalStatus(result.autoAccepted ? 'accepted' : 'pending_sent');
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request');
    } finally {
      setIsSending(false);
    }
  }

  function renderActionButton() {
    if (localStatus === 'accepted') {
      return (
        <View style={styles.friendBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
          <Text style={styles.friendText}>{t('friends.friend')}</Text>
        </View>
      );
    }

    if (localStatus === 'pending_sent') {
      return (
        <View style={styles.pendingBadge}>
          <Ionicons name="time-outline" size={14} color="#D97706" />
          <Text style={styles.pendingText}>{t('friends.requestSent')}</Text>
        </View>
      );
    }

    if (localStatus === 'pending_received') {
      return (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>{t('friends.requestReceived')}</Text>
        </View>
      );
    }

    return (
      <Pressable
        style={styles.addButton}
        onPress={handleSendRequest}
        disabled={isSending}
        accessibilityRole="button"
        accessibilityLabel={t('friends.addFriend')}
      >
        {isSending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="person-add" size={16} color="#fff" />
        )}
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={user.avatar_url ? { uri: user.avatar_url } : DEFAULT_AVATAR}
        style={styles.avatar}
      />
      <View style={styles.info}>
        <Text style={styles.displayName} numberOfLines={1}>
          {user.display_name || user.username}
        </Text>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Lv.{user.level}</Text>
        </View>
      </View>
      {renderActionButton()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 2,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  info: {
    flex: 1,
  },
  displayName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    marginBottom: 4,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2B2B2B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 2,
  },
  levelText: {
    fontSize: 9,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 2,
    backgroundColor: '#3C91E6',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
    backgroundColor: '#FEF3C7',
  },
  pendingText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#D97706',
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  friendText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#22C55E',
  },
});
