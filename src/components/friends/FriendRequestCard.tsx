// Pending friend request card component
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FriendRequest } from '../../store/friendsStore';

const DEFAULT_AVATAR = require('../../../assets/default-avatar.jpg');

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: (requestId: string) => Promise<boolean>;
  onDecline: (requestId: string) => Promise<boolean>;
}

export default function FriendRequestCard({ request, onAccept, onDecline }: FriendRequestCardProps) {
  const { t } = useTranslation();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  async function handleAccept() {
    setIsAccepting(true);
    await onAccept(request.id);
    setIsAccepting(false);
  }

  async function handleDecline() {
    setIsDeclining(true);
    await onDecline(request.id);
    setIsDeclining(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Image
          source={request.avatar_url ? { uri: request.avatar_url } : DEFAULT_AVATAR}
          style={styles.avatar}
        />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName} numberOfLines={1}>
              {request.display_name || request.username}
            </Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Lv.{request.level}</Text>
            </View>
          </View>
          <Text style={styles.username} numberOfLines={1}>@{request.username}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          style={styles.declineButton}
          onPress={handleDecline}
          disabled={isAccepting || isDeclining}
          accessibilityRole="button"
          accessibilityLabel={t('friends.decline')}
        >
          {isDeclining ? (
            <ActivityIndicator size="small" color="#999" />
          ) : (
            <Text style={styles.declineText}>{t('friends.decline')}</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.acceptButton}
          onPress={handleAccept}
          disabled={isAccepting || isDeclining}
          accessibilityRole="button"
          accessibilityLabel={t('friends.accept')}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.acceptText}>{t('friends.accept')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 2,
    padding: 12,
    borderWidth: 2,
    borderColor: '#3C91E6',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#3C91E6',
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
  actions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  declineButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#ddd',
    minWidth: 70,
    alignItems: 'center',
  },
  declineText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  acceptButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#22C55E',
    minWidth: 70,
    alignItems: 'center',
  },
  acceptText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
});
