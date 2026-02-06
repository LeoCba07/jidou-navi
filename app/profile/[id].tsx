// User profile screen - view another user's public profile
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { supabase } from '../../src/lib/supabase';
import { getLevelProgress } from '../../src/lib/xp';
import { useBadgeTranslation } from '../../src/hooks/useBadgeTranslation';
import UserAvatar from '../../src/components/UserAvatar';

// Public profile data we fetch for other users
type PublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  xp: number;
  visit_count: number;
  contribution_count: number;
  badge_count: number;
  country: string | null;
  level: number | null;
  role: string | null;
  created_at: string | null;
};

// Badge type from joined query
type UserBadge = {
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

export default function UserProfileScreen() {
  const { t } = useTranslation();
  const { getBadgeTranslation } = useBadgeTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBadges, setLoadingBadges] = useState(true);

  useEffect(() => {
    // If viewing own profile, redirect to the profile tab
    if (user && id === user.id) {
      router.replace('/(tabs)/profile');
      return;
    }

    if (id) {
      loadProfile();
      loadBadges();
    }
  }, [id, user]);

  async function loadProfile() {
    if (!id) return;

    const { data, error } = await supabase
      .from('public_profiles')
      .select('id, username, display_name, avatar_url, bio, contribution_count, visit_count, badge_count, country, xp, level, role, created_at')
      .eq('id', id)
      .single();

    if (!error && data) {
      setProfile(data as PublicProfile);
    }
    setLoading(false);
  }

  async function loadBadges() {
    if (!id) return;
    setLoadingBadges(true);

    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        id,
        unlocked_at,
        badge:badges (
          id,
          slug,
          name,
          description,
          icon_url,
          rarity
        )
      `)
      .eq('user_id', id)
      .order('unlocked_at', { ascending: false });

    if (!error && data) {
      setBadges(data as unknown as UserBadge[]);
    }
    setLoadingBadges(false);
  }

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
            <Ionicons name="arrow-back" size={24} color="#2B2B2B" />
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

  const levelProgress = getLevelProgress(profile.xp || 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2B2B2B" />
        </Pressable>
        <Text style={styles.title}>{t('userProfile.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.avatarContainer}>
            <UserAvatar
              url={profile.avatar_url}
              size={100}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.displayName}>
            {profile.display_name || profile.username || t('common.user')}
          </Text>
          <Text style={styles.username}>@{profile.username || 'user'}</Text>

          {/* Level Badge */}
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>
              {t('profile.level')} {levelProgress.currentLevel}
            </Text>
          </View>

          {profile.bio && (
            <Text style={styles.bio} numberOfLines={3}>
              {profile.bio}
            </Text>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <View style={styles.statBlockHeader}>
              <Ionicons name="footsteps-outline" size={18} color="#3C91E6" />
              <Text style={[styles.statBlockLabel, { color: '#3C91E6' }]}>
                {t('profile.machinesVisited')}
              </Text>
            </View>
            <Text style={[styles.statBlockNumber, { color: '#3C91E6' }]}>
              {profile.visit_count || 0}
            </Text>
          </View>
          <View style={styles.statBlock}>
            <View style={styles.statBlockHeader}>
              <Ionicons name="cube-outline" size={18} color="#FF4B4B" />
              <Text style={[styles.statBlockLabel, { color: '#FF4B4B' }]}>
                {t('profile.machinesAdded')}
              </Text>
            </View>
            <Text style={[styles.statBlockNumber, { color: '#FF4B4B' }]}>
              {profile.contribution_count || 0}
            </Text>
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('profile.badges')} ({badges.length})
          </Text>
          {loadingBadges ? (
            <ActivityIndicator color="#FF4B4B" style={styles.badgeLoader} />
          ) : badges.length === 0 ? (
            <View style={styles.emptyBadges}>
              <Ionicons name="trophy-outline" size={40} color="#ccc" />
              <Text style={styles.emptyBadgesText}>{t('profile.noBadgesYet')}</Text>
            </View>
          ) : (
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
                  <View
                    key={userBadge.id}
                    style={[
                      styles.badgeItem,
                      {
                        borderColor:
                          RARITY_COLORS[userBadge.badge.rarity || 'common'] ||
                          RARITY_COLORS.common,
                      },
                    ]}
                  >
                    {userBadge.badge.icon_url ? (
                      <Image
                        source={{ uri: userBadge.badge.icon_url }}
                        style={styles.badgeIcon}
                      />
                    ) : (
                      <View style={styles.badgePlaceholder}>
                        <Ionicons name="trophy" size={24} color="#FF4B4B" />
                      </View>
                    )}
                    <Text style={styles.badgeName} numberOfLines={1}>
                      {translation.name}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

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
    fontSize: 20,
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
    fontSize: 16,
    fontFamily: 'Inter',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
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
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FF4B4B',
  },
  displayName: {
    fontSize: 22,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
    marginBottom: 4,
    textAlign: 'center',
  },
  username: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#999',
    marginBottom: 12,
  },
  levelBadge: {
    backgroundColor: '#2B2B2B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 2,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  levelText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Silkscreen',
  },
  bio: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#444',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBlock: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 2,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
    alignItems: 'center',
  },
  statBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statBlockLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statBlockNumber: {
    fontSize: 28,
    fontFamily: 'DotGothic16',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#2B2B2B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeLoader: {
    padding: 20,
  },
  badgesScroll: {
    gap: 12,
    paddingRight: 20,
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
    width: 36,
    height: 36,
    marginBottom: 8,
  },
  badgePlaceholder: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    textAlign: 'center',
  },
  emptyBadges: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyBadgesText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#999',
    marginTop: 8,
  },
});
