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
import { useUserBadges } from '../../src/hooks/useUserBadges';
import { useAppModal } from '../../src/hooks/useAppModal';
import ProfileHeroCard from '../../src/components/profile/ProfileHeroCard';
import EarnedBadgeRow from '../../src/components/profile/EarnedBadgeRow';
import { FONT_SIZES, ICON_SIZES } from '../../src/theme/constants';

const pixelEmptyBadges = require('../../assets/pixel-empty-badges.png');

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

  const { badges, loadingBadges, fetchBadges } = useUserBadges({ userId: id });

  useEffect(() => {
    if (user && id === user.id) {
      router.replace('/(tabs)/profile');
      return;
    }

    if (id) {
      loadProfile();
      fetchBadges();
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
          />
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="trophy-outline" size={ICON_SIZES.sm} color="#D97706" style={styles.sectionTitleIcon} />
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
