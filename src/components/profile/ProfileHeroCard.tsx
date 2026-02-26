import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UserAvatar from '../UserAvatar';
import XPProgressBar from './XPProgressBar';
import StatsBanner from './StatsBanner';
import { FONT_SIZES, ICON_SIZES } from '../../theme/constants';

interface ProfileHeroCardProps {
  avatarUrl: string | null;
  avatarTimestamp?: number;
  displayName: string;
  bio?: string | null;
  xp: number;
  stats: { contributionCount: number; badgeCount: number; visitCount: number };
  onBadgePress?: () => void;
  onEditAvatar?: () => void;
  uploadingAvatar?: boolean;
  settingsButton?: React.ReactNode;
}

export default function ProfileHeroCard({
  avatarUrl,
  avatarTimestamp,
  displayName,
  bio,
  xp,
  stats,
  onBadgePress,
  onEditAvatar,
  uploadingAvatar,
  settingsButton,
}: ProfileHeroCardProps) {
  const resolvedAvatarUrl = avatarUrl && avatarTimestamp
    ? `${avatarUrl.split('?')[0]}?t=${avatarTimestamp}`
    : avatarUrl;

  return (
    <View style={styles.heroCard}>
      {settingsButton}
      {onEditAvatar ? (
        <Pressable onPress={onEditAvatar} style={styles.avatarContainer} disabled={uploadingAvatar}>
          <UserAvatar
            url={resolvedAvatarUrl}
            size={120}
            borderWidth={4}
            borderColor="#FF4B4B"
            style={styles.avatar}
          />
          <View style={styles.editAvatarButton}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="camera" size={ICON_SIZES.xs} color="#fff" />
            )}
          </View>
        </Pressable>
      ) : (
        <View style={styles.avatarContainer}>
          <UserAvatar
            url={resolvedAvatarUrl}
            size={120}
            borderWidth={4}
            borderColor="#FF4B4B"
            style={styles.avatar}
          />
        </View>
      )}
      <Text style={styles.displayName}>{displayName}</Text>
      <XPProgressBar xp={xp} />
      {bio ? <Text style={styles.bio} numberOfLines={2}>{bio}</Text> : null}
      <StatsBanner
        contributionCount={stats.contributionCount}
        badgeCount={stats.badgeCount}
        visitCount={stats.visitCount}
        onBadgePress={onBadgePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 24,
    borderWidth: 3,
    borderColor: '#FF4B4B',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 4,
    position: 'relative',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF4B4B',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  displayName: {
    fontSize: FONT_SIZES.xxl,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
    marginBottom: 4,
    textAlign: 'center',
  },
  bio: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter',
    color: '#444',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
});
