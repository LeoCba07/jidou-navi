// Profile screen - user info, stats, badges, and logout
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { useSavedMachinesStore } from '../../src/store/savedMachinesStore';
import { supabase } from '../../src/lib/supabase';
import { fetchSavedMachines, unsaveMachine, SavedMachine } from '../../src/lib/machines';
import { fetchUserPendingMachines, UserPendingMachine } from '../../src/lib/admin';
import { uploadAvatar } from '../../src/lib/storage';
import { getLevelProgress } from '../../src/lib/xp';
import { useAppModal } from '../../src/hooks/useAppModal';
import SettingsModal from '../../src/components/profile/SettingsModal';
import StatProgressCard from '../../src/components/profile/StatProgressCard';
import BadgeShowcase from '../../src/components/profile/BadgeShowcase';
import BadgeRequirementModal from '../../src/components/profile/BadgeRequirementModal';
import type { Badge } from '../../src/lib/badges';

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

// Default avatar image used when user has no custom avatar
const DEFAULT_AVATAR = require('../../assets/default-avatar.jpg');

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, profile, setProfile } = useAuthStore();
  const { removeSaved } = useSavedMachinesStore();
  const { showError, showConfirm, showInfo, showSuccess } = useAppModal();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [savedMachines, setSavedMachines] = useState<SavedMachine[]>([]);
  const [pendingMachines, setPendingMachines] = useState<UserPendingMachine[]>([]);
  const [visitedMachineIds, setVisitedMachineIds] = useState<Set<string>>(new Set());
  const [loadingBadges, setLoadingBadges] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());
  const [badgeRequirementModalVisible, setBadgeRequirementModalVisible] = useState(false);
  const [selectedLockedBadge, setSelectedLockedBadge] = useState<{
    badge: Badge;
    progress: { current: number; required: number };
  } | null>(null);

  async function handleEditAvatar() {
    if (!user) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showError(t('common.error'), t('addMachine.permissionNeeded'));
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingAvatar(true);
        const asset = result.assets[0];
        const fileName = `avatar_${Date.now()}.jpg`;
        
        const publicUrl = await uploadAvatar(user.id, {
          uri: asset.uri,
          type: 'image/jpeg',
          name: fileName,
        });

        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);

        if (error) throw error;

        // Update local state and force re-render with new timestamp
        const newTimestamp = Date.now();
        if (profile) {
          setProfile({ ...profile, avatar_url: publicUrl });
        }
        setAvatarTimestamp(newTimestamp);

        showSuccess(t('common.success'), t('profile.avatarUpdated'));
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      showError(t('common.error'), t('profile.avatarUpdateError'));
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Fetch user's badges
  async function fetchBadges() {
    if (!user) return;

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
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false });

    if (!error && data) {
      setBadges(data as unknown as UserBadge[]);
    }
    setLoadingBadges(false);
  }

  // Fetch all badges for milestone tracking
  async function fetchAllBadges() {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setAllBadges(data as Badge[]);
    }
  }

  // Fetch user's saved machines with visited status
  async function loadSavedMachines() {
    if (!user) return;
    const machines = await fetchSavedMachines();
    setSavedMachines(machines);

    // Get which saved machines have been visited
    if (machines.length > 0) {
      const machineIds = machines.map((sm) => sm.machine_id);
      const { data: visits } = await supabase
        .from('visits')
        .select('machine_id')
        .eq('user_id', user.id)
        .in('machine_id', machineIds);

      setVisitedMachineIds(new Set(visits?.map((v) => v.machine_id) || []));
    }
    setLoadingSaved(false);
  }

  // Fetch user's pending/rejected machines
  async function loadPendingMachines() {
    if (!user) return;
    const machines = await fetchUserPendingMachines();
    setPendingMachines(machines);
    setLoadingPending(false);
  }

  // Handle unsave action
  function handleUnsave(machineId: string) {
    showConfirm(
      t('profile.removeFromSaved.title'),
      t('profile.removeFromSaved.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            // Optimistic update
            setSavedMachines((prev) => prev.filter((m) => m.machine_id !== machineId));
            removeSaved(machineId);
            const success = await unsaveMachine(machineId);
            if (!success) {
              // Revert on failure - reload the list
              loadSavedMachines();
              showError(t('common.error'), t('profile.removeError'));
            }
          },
        },
      ]
    );
  }

  // Navigate to machine detail
  function goToMachine(saved: SavedMachine) {
    router.push({
      pathname: '/machine/[id]',
      params: {
        id: saved.machine.id,
        name: saved.machine.name || '',
        description: saved.machine.description || '',
        address: saved.machine.address || '',
        latitude: String(saved.machine.latitude),
        longitude: String(saved.machine.longitude),
        distance_meters: '0', // We don't have distance from profile
        primary_photo_url: saved.machine.primary_photo_url || '',
        visit_count: String(saved.machine.visit_count),
        status: saved.machine.status || '',
      },
    });
  }

  useEffect(() => {
    fetchBadges();
    fetchAllBadges();
    loadSavedMachines();
    loadPendingMachines();
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchBadges(), fetchAllBadges(), loadSavedMachines(), loadPendingMachines()]);
    setRefreshing(false);
  }, [user]);

  function handleLogout() {
    showConfirm(t('profile.logoutConfirm.title'), t('profile.logoutConfirm.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    showConfirm(
      t('profile.deleteAccountConfirm.title'),
      t('profile.deleteAccountConfirm.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteAccount'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user) return;

              // Call RPC function to delete user and all related data
              // @ts-ignore - RPC function to be added in database
              const { error } = await supabase.rpc('delete_user_account');

              if (error) {
                console.error('Delete account error:', error);
                showError(t('common.error'), t('profile.deleteAccountError'));
                return;
              }

              // Sign out the user
              await supabase.auth.signOut();
              showSuccess(t('profile.deleteAccountSuccess.title'), t('profile.deleteAccountSuccess.message'));
            } catch (err) {
              console.error('Delete account error:', err);
              showError(t('common.error'), t('profile.deleteAccountError'));
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4B4B" />
        }
      >
        {/* Hero Card - Character Sheet */}
        <View style={styles.userSection}>
          <View style={styles.heroCard}>
            <Pressable
              style={styles.settingsGear}
              onPress={() => setSettingsModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t('profile.accountSettings')}
            >
              <Ionicons name="settings-outline" size={20} color="#666" />
            </Pressable>
            <Pressable onPress={handleEditAvatar} style={styles.avatarContainer} disabled={uploadingAvatar}>
              <Image
                key={avatarTimestamp}
                source={
                  profile?.avatar_url
                    ? { uri: `${profile.avatar_url.split('?')[0]}?t=${avatarTimestamp}` }
                    : DEFAULT_AVATAR
                }
                style={styles.avatar}
              />
              <View style={styles.editAvatarButton}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={16} color="#fff" />
                )}
              </View>
            </Pressable>
            <Text style={styles.displayName}>
              {profile?.display_name || profile?.username || t('common.user')}
            </Text>
            <Text style={styles.username}>@{profile?.username || 'user'}</Text>
            
            {/* XP and Level Bar */}
            <View style={styles.xpSection}>
              {(() => {
                const progress = getLevelProgress(profile?.xp || 0);
                return (
                  <>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelText}>{t('profile.level', { defaultValue: 'LVL' })} {progress.currentLevel}</Text>
                    </View>
                    <View style={styles.xpBarContainer}>
                      <View style={[styles.xpBarFill, { width: `${progress.percentage}%` }]} />
                      <Text style={styles.xpText}>
                        {Math.floor(progress.currentXP)} / {Math.floor(progress.xpForNextLevel)} XP
                      </Text>
                    </View>
                  </>
                );
              })()}
            </View>

            {profile?.bio && <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>}
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsDashboard}>
          {/* Simple stat blocks row */}
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <View style={styles.statBlockHeader}>
                <Ionicons name="cube-outline" size={18} color="#FF4B4B" />
                <Text style={[styles.statBlockLabel, { color: '#FF4B4B' }]}>
                  {t('profile.machinesAdded')}
                </Text>
              </View>
              <Text style={[styles.statBlockNumber, { color: '#FF4B4B' }]}>
                {profile?.contribution_count || 0}
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
                {profile?.badge_count || 0}
              </Text>
            </View>
          </View>

          {/* Progress card for visits */}
          <StatProgressCard
            icon="footsteps-outline"
            label={t('profile.machinesVisited')}
            currentCount={profile?.visit_count || 0}
            color="#3C91E6"
            triggerType="visit_count"
            allBadges={allBadges}
          />
        </View>

        {/* Pending Submissions Section */}
        {pendingMachines.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.mySubmissions')}</Text>
            {loadingPending ? (
              <ActivityIndicator color="#FF4B4B" style={styles.badgeLoader} />
            ) : (
              <View style={styles.savedList}>
                {pendingMachines.map((machine) => (
                  <View key={machine.id} style={styles.pendingCard}>
                    {machine.primary_photo_url ? (
                      <Image
                        source={{ uri: machine.primary_photo_url }}
                        style={[styles.savedPhoto, styles.savedPhotoWithImage]}
                      />
                    ) : (
                      <View style={[styles.savedPhoto, styles.savedPhotoPlaceholder]}>
                        <Ionicons name="image-outline" size={24} color="#ccc" />
                      </View>
                    )}
                    <View style={styles.savedInfo}>
                      <View style={styles.savedNameRow}>
                        <Text style={styles.savedName} numberOfLines={1}>
                          {machine.name || t('machine.unnamed')}
                        </Text>
                        {machine.status === 'pending' ? (
                          <View style={styles.pendingBadge}>
                            <Ionicons name="time-outline" size={12} color="#D97706" />
                            <Text style={styles.pendingBadgeText}>{t('profile.pendingReview')}</Text>
                          </View>
                        ) : (
                          <View style={styles.rejectedBadge}>
                            <Ionicons name="close-circle-outline" size={12} color="#DC2626" />
                            <Text style={styles.rejectedBadgeText}>{t('profile.rejected')}</Text>
                          </View>
                        )}
                      </View>
                      {machine.status === 'rejected' && machine.rejection_reason && (
                        <Text style={styles.rejectionReason} numberOfLines={2}>
                          {machine.rejection_reason}
                        </Text>
                      )}
                      {machine.status === 'pending' && (
                        <Text style={styles.pendingHint}>{t('profile.pendingHint')}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Quest Log Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.questLog')}</Text>
          {loadingSaved ? (
            <ActivityIndicator color="#FF4B4B" style={styles.badgeLoader} />
          ) : savedMachines.length === 0 ? (
            <View style={styles.emptyBadges}>
              <Ionicons name="bookmark-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>{t('profile.noQuestLog')}</Text>
              <Text style={styles.emptySubtext}>
                {t('profile.questLogHint')}
              </Text>
            </View>
          ) : (
            <View style={styles.savedList}>
              {savedMachines.map((saved) => (
                <Pressable
                  key={saved.id}
                  style={styles.savedCard}
                  onPress={() => goToMachine(saved)}
                >
                  {saved.machine.primary_photo_url ? (
                    <Image
                      source={{ uri: saved.machine.primary_photo_url }}
                      style={[styles.savedPhoto, styles.savedPhotoWithImage]}
                    />
                  ) : (
                    <View style={[styles.savedPhoto, styles.savedPhotoPlaceholder]}>
                      <Ionicons name="image-outline" size={24} color="#ccc" />
                    </View>
                  )}
                  <View style={styles.savedInfo}>
                    <View style={styles.savedNameRow}>
                      <Text style={styles.savedName} numberOfLines={1}>
                        {saved.machine.name || t('machine.unnamed')}
                      </Text>
                      {visitedMachineIds.has(saved.machine_id) && (
                        <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                      )}
                    </View>
                    <View style={styles.savedAddressRow}>
                      <Ionicons name="location-outline" size={14} color="#999" />
                      <Text style={styles.savedAddress} numberOfLines={1}>
                        {saved.machine.address || t('machine.noAddress')}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={styles.unsaveButton}
                    onPress={() => handleUnsave(saved.machine_id)}
                  >
                    <Ionicons name="bookmark" size={20} color="#FF4B4B" />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.badges')}</Text>
          {loadingBadges ? (
            <ActivityIndicator color="#FF4B4B" style={styles.badgeLoader} />
          ) : (
            <BadgeShowcase
              earnedBadges={badges}
              allBadges={allBadges}
              userStats={{
                visit_count: profile?.visit_count || 0,
                contribution_count: profile?.contribution_count || 0,
              }}
              onLockedBadgePress={(badge, progress) => {
                setSelectedLockedBadge({ badge, progress });
                setBadgeRequirementModalVisible(true);
              }}
              onEarnedBadgePress={(badge) => showInfo(badge.name, badge.description)}
            />
          )}
        </View>

        {/* Support Us Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.supportUs')}</Text>
          <View style={styles.supportContainer}>
            <Text style={styles.supportText}>{t('profile.supportDescription')}</Text>
            <Pressable
              style={styles.supportButton}
              onPress={() => {
                const supportUrl = 'https://buymeacoffee.com/jidounavi';
                Linking.openURL(supportUrl).catch(() => {
                  showInfo(t('profile.supportUs'), t('profile.supportLinkError'));
                });
              }}
              accessibilityRole="button"
              accessibilityLabel={t('profile.supportButton')}
            >
              <Ionicons name="heart" size={18} color="#fff" />
              <Text style={styles.supportButtonText}>{t('profile.supportButton')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <SettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        user={user}
        profile={profile}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
      />

      {/* Badge Requirement Modal */}
      <BadgeRequirementModal
        badge={selectedLockedBadge?.badge || null}
        userProgress={selectedLockedBadge?.progress || { current: 0, required: 0 }}
        visible={badgeRequirementModalVisible}
        onClose={() => setBadgeRequirementModalVisible(false)}
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
    fontSize: 20,
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
  settingsGear: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FF4B4B',
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
    backgroundColor: '#22C55E', // Pixel green
  },
  xpText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 10,
    fontFamily: 'Silkscreen',
    color: '#2B2B2B',
    lineHeight: 16,
  },
  bio: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#444',
    textAlign: 'center',
    marginBottom: 8,
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
  badgeLoader: {
    marginTop: 20,
  },
  emptyBadges: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  savedList: {
    gap: 12,
  },
  savedCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 2,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
  },
  savedPhoto: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  savedPhotoWithImage: {
    borderWidth: 2,
    borderColor: '#FF4B4B',
  },
  savedPhotoPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  savedNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  savedName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    flex: 1,
  },
  savedAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedAddress: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#999',
    flex: 1,
  },
  unsaveButton: {
    padding: 8,
  },
  pendingCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 2,
    padding: 12,
    alignItems: 'flex-start',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#D97706',
  },
  rejectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rejectedBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
  },
  rejectionReason: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#DC2626',
    marginTop: 4,
  },
  pendingHint: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#999',
    marginTop: 4,
  },
  supportContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  supportText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF4B4B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 3,
  },
  supportButtonText: {
    fontSize: 15,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
});
