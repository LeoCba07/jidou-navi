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
import { useAppModal } from '../../src/hooks/useAppModal';
import UserAvatar from '../../src/components/UserAvatar';
import EarnedBadgeRow from '../../src/components/profile/EarnedBadgeRow';
import type { UserBadge } from '../../src/components/profile/EarnedBadgeRow';

const pixelEmptyBadges = require('../../assets/pixel-empty-badges.png');
const pixelStatAdded = require('../../assets/pixel-stat-added.png');
const pixelStatBadges = require('../../assets/pixel-stat-badges.png');
const pixelStatVisits = require('../../assets/pixel-stat-visits.png');

// Public profile data we fetch for other users
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
      .select('id, username, display_name, avatar_url, contribution_count, visit_count, badge_count, country, xp, level, role, created_at')
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
  const rawPercentage = Number(levelProgress?.percentage);
  const safePercentage = Number.isFinite(rawPercentage)
    ? Math.min(100, Math.max(0, rawPercentage))
    : 0;

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
              size={120}
              borderWidth={4}
              borderColor="#FF4B4B"
              style={styles.avatar}
            />
          </View>
          <Text style={styles.displayName}>
            {profile.display_name || profile.username || t('common.user')}
          </Text>

          {/* XP and Level Bar */}
          <View style={styles.xpSection}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>
                {t('profile.level')} {levelProgress.currentLevel}
              </Text>
            </View>
            <View style={styles.xpBarContainer}>
              <View style={[styles.xpBarFill, { width: `${safePercentage}%` }]} />
              <Text style={styles.xpText}>
                {Math.floor(levelProgress.currentXP)} / {Math.floor(levelProgress.xpForNextLevel)} XP
              </Text>
            </View>
          </View>

          {/* Stats Banner */}
          <View style={styles.statsBanner}>
            <View style={styles.statsBannerColumn}>
              <Image source={pixelStatAdded} style={styles.statsBannerIcon} />
              <Text style={styles.statsBannerLabel}>{t('profile.machinesAdded')}</Text>
              <Text style={styles.statsBannerNumber}>{profile.contribution_count || 0}</Text>
            </View>
            <View style={styles.statsBannerDivider} />
            <View style={styles.statsBannerColumn}>
              <Image source={pixelStatBadges} style={styles.statsBannerIcon} />
              <Text style={styles.statsBannerLabel}>{t('profile.badges')}</Text>
              <Text style={styles.statsBannerNumber}>{profile.badge_count || 0}</Text>
            </View>
            <View style={styles.statsBannerDivider} />
            <View style={styles.statsBannerColumn}>
              <Image source={pixelStatVisits} style={styles.statsBannerIcon} />
              <Text style={styles.statsBannerLabel}>{t('profile.machinesVisited')}</Text>
              <Text style={styles.statsBannerNumber}>{profile.visit_count || 0}</Text>
            </View>
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="trophy-outline" size={16} color="#D97706" style={styles.sectionTitleIcon} />
            <Text style={styles.sectionTitle}>
              {t('profile.badges')} ({badges.length})
            </Text>
          </View>
          {loadingBadges ? (
            <ActivityIndicator color="#FF4B4B" style={styles.badgeLoader} />
          ) : badges.length === 0 ? (
            <View style={styles.emptyBadges}>
              <Image source={pixelEmptyBadges} style={styles.emptyImage} />
              <Text style={styles.emptyBadgesText}>{t('profile.noBadgesYet')}</Text>
            </View>
          ) : (
            <EarnedBadgeRow
              badges={badges}
              onBadgePress={(badge) => showInfo(badge.name, badge.description)}
            />
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
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  displayName: {
    fontSize: 22,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
    marginBottom: 4,
    textAlign: 'center',
  },
  xpSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  levelBadge: {
    backgroundColor: '#2B2B2B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 2,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  levelText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Silkscreen',
  },
  xpBarContainer: {
    width: '100%',
    height: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#2B2B2B',
    borderRadius: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#22C55E',
  },
  xpText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 10,
    fontFamily: 'Silkscreen',
    color: '#2B2B2B',
    lineHeight: 20,
  },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: '#FF4B4B',
    marginHorizontal: -24,
    marginBottom: -24,
    marginTop: 16,
    paddingVertical: 16,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  statsBannerColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statsBannerDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  statsBannerIcon: {
    width: 36,
    height: 36,
  },
  statsBannerLabel: {
    fontSize: 8,
    fontFamily: 'Silkscreen',
    color: 'rgba(255, 255, 255, 0.85)',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  statsBannerNumber: {
    fontSize: 28,
    fontFamily: 'DotGothic16',
    color: '#fff',
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
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#2B2B2B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeLoader: {
    padding: 20,
  },
  emptyBadges: {
    backgroundColor: '#fff',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
  },
  emptyImage: {
    width: 120,
    height: 120,
  },
  emptyBadgesText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#999',
    marginTop: 8,
  },
});
