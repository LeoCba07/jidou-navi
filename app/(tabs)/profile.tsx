// Profile screen - user info, stats, badges, and logout
import { useState, useCallback, useRef } from 'react';
import { useFocusEffect, useScrollToTop } from '@react-navigation/native';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { useFriendsStore } from '../../src/store/friendsStore';
import { useUserBadges } from '../../src/hooks/useUserBadges';
import { useAvatarUpload } from '../../src/hooks/useAvatarUpload';
import { useSavedMachinesData } from '../../src/hooks/useSavedMachinesData';
import { useAccountActions } from '../../src/hooks/useAccountActions';
import ProfileHeroCard from '../../src/components/profile/ProfileHeroCard';
import QuestLogSection from '../../src/components/profile/QuestLogSection';
import FriendsSection from '../../src/components/profile/FriendsSection';
import SupportSection from '../../src/components/profile/SupportSection';
import BadgeShowcase from '../../src/components/profile/BadgeShowcase';
import BadgeCollectionModal from '../../src/components/profile/BadgeCollectionModal';
import BadgeRequirementModal from '../../src/components/profile/BadgeRequirementModal';
import SettingsModal from '../../src/components/profile/SettingsModal';
import { FriendsModal } from '../../src/components/friends';
import PixelLoader from '../../src/components/PixelLoader';
import type { Badge } from '../../src/lib/badges';
import { FONT_SIZES, ICON_SIZES } from '../../src/theme/constants';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, profile, setProfile } = useAuthStore();
  const { friends, pendingRequestCount, loadFriends, loadPendingRequestCount } = useFriendsStore();
  const scrollRef = useRef<ScrollView>(null);

  useScrollToTop(scrollRef);

  // Hooks
  const { badges, allBadges, loadingBadges, loadingAllBadges, fetchBadges, fetchAllBadges } = useUserBadges({
    userId: user?.id,
    fetchAllBadges: true,
  });
  const { handleEditAvatar, uploadingAvatar, avatarTimestamp } = useAvatarUpload();
  const {
    sortedSavedMachines, savedMachines, loadingSaved, sortMode, setSortMode,
    handleUnsave, goToMachine, handleShowOnMap,
    loadSavedMachines, getUserLocation, visitedMachineIds,
  } = useSavedMachinesData();
  const { handleLogout, handleRemoveFriend, handleDeleteAccount } = useAccountActions();

  // Modal state
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isCollectionVisible, setIsCollectionVisible] = useState(false);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<{
    badge: Badge;
    progress: { current: number; required: number };
    isEarned: boolean;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchBadges();
        fetchAllBadges();
        loadSavedMachines();
        loadPendingRequestCount();
        loadFriends();
        getUserLocation();
      }
    }, [user, fetchBadges, fetchAllBadges, loadSavedMachines, loadPendingRequestCount, loadFriends, getUserLocation])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchBadges(), fetchAllBadges(), loadSavedMachines(),
      loadPendingRequestCount(), loadFriends(), getUserLocation(),
    ]);
    setRefreshing(false);
  }, [fetchBadges, fetchAllBadges, loadSavedMachines, loadPendingRequestCount, loadFriends, getUserLocation]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4B4B" />
        }
      >
        {/* Hero Card */}
        <View style={styles.userSection}>
          <ProfileHeroCard
            avatarUrl={profile?.avatar_url ?? null}
            avatarTimestamp={avatarTimestamp}
            displayName={profile?.display_name || profile?.username || t('common.user')}
            bio={profile?.bio}
            xp={profile?.xp || 0}
            stats={{
              contributionCount: profile?.contribution_count || 0,
              badgeCount: profile?.badge_count || 0,
              visitCount: profile?.visit_count || 0,
            }}
            onBadgePress={() => setIsCollectionVisible(true)}
            onEditAvatar={handleEditAvatar}
            uploadingAvatar={uploadingAvatar}
            settingsButton={
              <Pressable
                style={styles.settingsGear}
                onPress={() => setSettingsModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t('profile.accountSettings')}
              >
                <Ionicons name="settings-outline" size={ICON_SIZES.sm} color="#666" />
              </Pressable>
            }
          />
        </View>

        {/* Quest Log */}
        <QuestLogSection
          sortedMachines={sortedSavedMachines}
          loading={loadingSaved}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          visitedMachineIds={visitedMachineIds}
          onMachinePress={goToMachine}
          onUnsave={handleUnsave}
          onShowOnMap={handleShowOnMap}
          totalCount={savedMachines.length}
        />

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
                visit_count: profile?.visit_count || 0,
                contribution_count: profile?.contribution_count || 0,
              }}
              onLockedBadgePress={(badge, progress) => {
                setSelectedBadge({ badge, progress, isEarned: false });
              }}
              onEarnedBadgePress={(earnedBadge) => {
                const fullBadge = allBadges.find((b) => b.id === earnedBadge.id);
                if (!fullBadge) return;
                setSelectedBadge({
                  badge: fullBadge,
                  progress: { current: 0, required: 0 },
                  isEarned: true,
                });
              }}
              onViewAll={() => setIsCollectionVisible(true)}
            />
          )}
        </View>

        {/* Friends */}
        <FriendsSection
          friends={friends}
          pendingRequestCount={pendingRequestCount}
          onAddFriend={() => setFriendsModalVisible(true)}
          onRemoveFriend={handleRemoveFriend}
        />

        {/* Support Us */}
        <SupportSection />
      </ScrollView>

      {/* Modals */}
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        user={user}
        profile={profile}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        onProfileUpdate={(newProfile) => setProfile(newProfile)}
      />
      <BadgeRequirementModal
        badge={selectedBadge?.badge || null}
        userProgress={selectedBadge?.progress || { current: 0, required: 0 }}
        isEarned={selectedBadge?.isEarned}
        visible={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />
      <FriendsModal
        visible={friendsModalVisible}
        onClose={() => setFriendsModalVisible(false)}
      />
      <BadgeCollectionModal
        visible={isCollectionVisible}
        onClose={() => setIsCollectionVisible(false)}
        allBadges={allBadges}
        earnedBadges={badges}
        userStats={{
          visit_count: profile?.visit_count || 0,
          contribution_count: profile?.contribution_count || 0,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF3E7',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  userSection: {
    marginBottom: 24,
  },
  settingsGear: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter-Bold',
    color: '#2B2B2B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
});
