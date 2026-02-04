import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';
import { useAppModal } from '../../src/hooks/useAppModal';
import { getLevelProgress } from '../../src/lib/xp';
import BadgeShowcase from '../../src/components/profile/BadgeShowcase';
import StatProgressCard from '../../src/components/profile/StatProgressCard';
import type { Badge } from '../../src/lib/badges';
import type { Database } from '../../src/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

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

const DEFAULT_AVATAR = require('../../assets/default-avatar.jpg');

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { showInfo } = useAppModal();
  
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Redirect to own profile if ID matches
  useEffect(() => {
    if (user && id === user.id) {
      router.replace('/(tabs)/profile');
    }
  }, [id, user]);

  useEffect(() => {
    if (id && (!user || id !== user.id)) {
      loadProfileData();
    }
  }, [id]);

  async function loadProfileData() {
    try {
      setLoading(true);
      
      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;
      setTargetProfile(profileData);

      // 2. Fetch User Badges
      const { data: badgesData, error: badgesError } = await supabase
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

      if (badgesError) throw badgesError;
      setBadges(badgesData as unknown as UserBadge[]);

      // 3. Fetch All Badges (for showcase context)
      const { data: allBadgesData, error: allBadgesError } = await supabase
        .from('badges')
        .select('*')
        .order('display_order', { ascending: true });

      if (allBadgesError) throw allBadgesError;
      setAllBadges(allBadgesData as Badge[]);

    } catch (error) {
      console.error('Error loading profile:', error);
      showInfo(t('common.error'), t('map.fetchError')); // Generic error for now
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4B4B" />
      </View>
    );
  }

  if (!targetProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </Pressable>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.notFoundText}>{t('friends.noUsersFound', { query: '' })}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
          <Text style={styles.backText}>{t('common.back')}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Card */}
        <View style={styles.userSection}>
          <View style={styles.heroCard}>
            <View style={styles.avatarContainer}>
              <Image
                source={
                  !imageError && targetProfile.avatar_url
                    ? { uri: targetProfile.avatar_url }
                    : DEFAULT_AVATAR
                }
                style={styles.avatar}
                onError={() => setImageError(true)}
              />
            </View>
            <Text style={styles.displayName}>
              {targetProfile.display_name || targetProfile.username || t('common.user')}
            </Text>
            <Text style={styles.username}>@{targetProfile.username || 'user'}</Text>

            {/* XP and Level */}
            <View style={styles.xpSection}>
              {(() => {
                const progress = getLevelProgress(targetProfile.xp || 0);
                return (
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>{t('profile.level')} {progress.currentLevel}</Text>
                  </View>
                );
              })()}
            </View>

            {targetProfile.bio && <Text style={styles.bio}>{targetProfile.bio}</Text>}
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsDashboard}>
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <View style={styles.statBlockHeader}>
                <Ionicons name="cube-outline" size={18} color="#FF4B4B" />
                <Text style={[styles.statBlockLabel, { color: '#FF4B4B' }]}>
                  {t('profile.machinesAdded')}
                </Text>
              </View>
              <Text style={[styles.statBlockNumber, { color: '#FF4B4B' }]}>
                {targetProfile.contribution_count || 0}
              </Text>
            </View>
            <View style={styles.statBlock}>
              <View style={styles.statBlockHeader}>
                <Ionicons name="trophy-outline" size={18} color="#D97706" />
                <Text style={[styles.statBlockLabel, { color: '#D97706' }]}>
                  {t('profile.badges')}
                </Text>
              </View>
              <Text style={[styles.statBlockNumber, { color: '#D97706' }]}>
                {targetProfile.badge_count || 0}
              </Text>
            </View>
          </View>

          <StatProgressCard
            icon="footsteps-outline"
            label={t('profile.machinesVisited')}
            currentCount={targetProfile.visit_count || 0}
            color="#3C91E6"
            triggerType="visit_count"
            allBadges={allBadges}
          />
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.badges')}</Text>
          <BadgeShowcase
            earnedBadges={badges}
            allBadges={allBadges}
            userStats={{
              visit_count: targetProfile.visit_count || 0,
              contribution_count: targetProfile.contribution_count || 0,
            }}
            onEarnedBadgePress={(badge) => showInfo(badge.name, badge.description)}
            onLockedBadgePress={(badge) => showInfo(badge.name, badge.description)}
          />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD1',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  backText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#333',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'DotGothic16',
    color: '#333',
  },
  scrollContent: {
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 16,
    fontFamily: 'Inter',
    color: '#666',
  },
  userSection: {
    marginBottom: 24,
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 24,
    borderWidth: 3,
    borderColor: '#3C91E6', // Different color for public profile
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 4,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#3C91E6',
  },
  displayName: {
    fontSize: 24,
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
  xpSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBadge: {
    backgroundColor: '#2B2B2B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 2,
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
  statsDashboard: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statBlockNumber: {
    fontSize: 32,
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
});
