// User profile screen - view another user's public profile
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { supabase } from '../../src/lib/supabase';
import { useUserBadges } from '../../src/hooks/useUserBadges';
import { useAppModal } from '../../src/hooks/useAppModal';
import { useFriendshipStatus, type FriendshipStatus } from '../../src/hooks/useFriendshipStatus';
import ProfileHeroCard from '../../src/components/profile/ProfileHeroCard';
import BadgeShowcase from '../../src/components/profile/BadgeShowcase';
import PixelLoader from '../../src/components/PixelLoader';
import { FONT_SIZES, ICON_SIZES, COLORS } from '../../src/theme/constants';

type PublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  xp: number;
  visit_count: number;
  contribution_count: number;
  badge_count: number;
  country: string | null;
  level: number | null;
  role: string | null;
  created_at: string | null;
};

export default function UserProfileScreen() {
  const { t } = useTranslation();
  const { showInfo } = useAppModal();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const { badges, allBadges, loadingBadges, loadingAllBadges, fetchBadges, fetchAllBadges } = useUserBadges({
    userId: id,
    fetchAllBadges: true,
  });
  const { status: friendshipStatus, sendRequest, acceptRequest } = useFriendshipStatus(id);

  const loadProfile = useCallback(async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('public_profiles')
      .select('id, username, display_name, avatar_url, contribution_count, visit_count, badge_count, country, xp, level, role, created_at')
      .eq('id', id)
      .single();

    if (!error && data) {
      setProfile(data as PublicProfile);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (user && id === user.id) {
      router.replace('/(tabs)/profile');
      return;
    }

    if (id) {
      loadProfile();
      fetchBadges();
      fetchAllBadges();
    }
  }, [id, user, loadProfile, fetchBadges, fetchAllBadges]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4B4B" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={ICON_SIZES.md} color="#2B2B2B" />
          </Pressable>
          <Text style={styles.title}>{t('profile.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>{t('userProfile.notFound')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={ICON_SIZES.md} color="#2B2B2B" />
        </Pressable>
        <Text style={styles.title}>{t('userProfile.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero Card */}
        <View style={styles.heroCardWrapper}>
          <ProfileHeroCard
            avatarUrl={profile.avatar_url}
            displayName={profile.display_name || profile.username || t('common.user')}
            xp={profile.xp || 0}
            stats={{
              contributionCount: profile.contribution_count || 0,
              badgeCount: profile.badge_count || 0,
              visitCount: profile.visit_count || 0,
            }}
            settingsButton={<FriendActionButton status={friendshipStatus} onSendRequest={sendRequest} onAccept={acceptRequest} />}
          />
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="trophy-outline" size={ICON_SIZES.sm} color="#D97706" style={styles.sectionTitleIcon} />
            <Text style={styles.sectionTitle}>{t('profile.badges')}</Text>
          </View>
          {loadingBadges || loadingAllBadges ? (
            <PixelLoader size={40} />
          ) : (
            <BadgeShowcase
              earnedBadges={badges}
              allBadges={allBadges}
              userStats={{
                visit_count: profile.visit_count || 0,
                contribution_count: profile.contribution_count || 0,
              }}
              showLockedBadges={false}
              onEarnedBadgePress={(earnedBadge) => {
                showInfo(earnedBadge.name, earnedBadge.description);
              }}
              onViewAll={() => {}}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function FriendActionButton({
  status,
  onSendRequest,
  onAccept,
}: {
  status: FriendshipStatus;
  onSendRequest: () => void;
  onAccept: () => void;
}) {
  const { t } = useTranslation();

  if (status === 'loading') {
    return (
      <View style={friendStyles.button}>
        <ActivityIndicator size="small" color={COLORS.textMuted} />
      </View>
    );
  }

  if (status === 'accepted') {
    return (
      <View style={[friendStyles.button, friendStyles.accepted]}>
        <Ionicons name="checkmark-circle" size={ICON_SIZES.xs} color="#16A34A" />
        <Text style={[friendStyles.label, { color: '#16A34A' }]}>{t('friends.friend')}</Text>
      </View>
    );
  }

  if (status === 'pending_sent') {
    return (
      <View style={[friendStyles.button, friendStyles.pending]}>
        <Ionicons name="time-outline" size={ICON_SIZES.xs} color={COLORS.textMuted} />
        <Text style={[friendStyles.label, { color: COLORS.textMuted }]}>{t('friends.requestSent')}</Text>
      </View>
    );
  }

  if (status === 'pending_received') {
    return (
      <Pressable style={[friendStyles.button, friendStyles.accept]} onPress={onAccept}>
        <Ionicons name="person-add" size={ICON_SIZES.xs} color="#fff" />
        <Text style={[friendStyles.label, { color: '#fff' }]}>{t('friends.accept')}</Text>
      </Pressable>
    );
  }

  // status === 'none'
  return (
    <Pressable style={[friendStyles.button, friendStyles.add]} onPress={onSendRequest}>
      <Ionicons name="person-add-outline" size={ICON_SIZES.xs} color="#fff" />
      <Text style={[friendStyles.label, { color: '#fff' }]}>{t('friends.addFriend')}</Text>
    </Pressable>
  );
}

const friendStyles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 1,
  },
  add: {
    backgroundColor: '#3B82F6',
  },
  pending: {
    backgroundColor: '#F3F4F6',
  },
  accept: {
    backgroundColor: '#16A34A',
  },
  accepted: {
    backgroundColor: '#F0FDF4',
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter-Bold',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF3E7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF3E7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: 'Inter',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  heroCardWrapper: {
    marginBottom: 16,
  },
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
});
