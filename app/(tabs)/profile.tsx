// Profile screen - user info, stats, badges, and logout
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import * as Manipulator from 'expo-image-manipulator';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { unregisterPushNotificationsAsync } from '../../src/lib/notifications';
import { useSavedMachinesStore } from '../../src/store/savedMachinesStore';
import { useVisitedMachinesStore } from '../../src/store/visitedMachinesStore';
import { useFriendsStore } from '../../src/store/friendsStore';
import { supabase } from '../../src/lib/supabase';
import { fetchSavedMachines, unsaveMachine, SavedMachine, calculateDistance } from '../../src/lib/machines';
import { uploadAvatar } from '../../src/lib/storage';
import { XP_VALUES } from '../../src/lib/xp';
import XPProgressBar from '../../src/components/profile/XPProgressBar';
import { useAppModal } from '../../src/hooks/useAppModal';
import SettingsModal from '../../src/components/profile/SettingsModal';
import StatProgressCard from '../../src/components/profile/StatProgressCard';
import BadgeShowcase from '../../src/components/profile/BadgeShowcase';
import BadgeRequirementModal from '../../src/components/profile/BadgeRequirementModal';
import { FriendsModal, FriendCard } from '../../src/components/friends';
import UserAvatar from '../../src/components/UserAvatar';
import type { Friend } from '../../src/store/friendsStore';
import type { Badge } from '../../src/lib/badges';
import VisitedStamp from '../../src/components/machine/VisitedStamp';
import { BORDER_RADIUS, COLORS, FONTS, SHADOWS, SPACING, FONT_SIZES, ICON_SIZES } from '../../src/theme/constants';

// Image quality setting for avatars (smaller size needed)
const AVATAR_QUALITY = 0.7;
const MAX_AVATAR_DIMENSION = 400;

/**
 * Processes an avatar image to limit resolution and compress it.
 */
async function processAvatar(uri: string): Promise<string> {
  try {
    const result = await Manipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_AVATAR_DIMENSION, height: MAX_AVATAR_DIMENSION } }],
      { compress: AVATAR_QUALITY, format: Manipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.warn('Avatar processing failed, falling back to original:', error);
    return uri;
  }
}

// Pixel art assets for empty states and icons
const pixelEmptyQuest = require('../../assets/pixel-empty-quest.png');
const pixelEmptyFriends = require('../../assets/pixel-empty-friends.png');
const pixelCoffee = require('../../assets/pixel-coffee.png');
const pixelStatAdded = require('../../assets/pixel-stat-added.png');
const pixelStatBadges = require('../../assets/pixel-stat-badges.png');
const pixelStatVisits = require('../../assets/pixel-stat-visits.png');
const pixelBookmark = require('../../assets/pixel-ui-bookmark.png');
const pixelLocation = require('../../assets/pixel-ui-location.png');
const pixelHeart = require('../../assets/pixel-ui-heart.png');

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

import * as Sharing from 'expo-sharing';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, profile, setProfile } = useAuthStore();
  const { removeSaved } = useSavedMachinesStore();
  const { visitedMachineIds } = useVisitedMachinesStore();
  const { friends, pendingRequestCount, loadFriends, loadPendingRequestCount, removeFriend } = useFriendsStore();
  const { showError, showConfirm, showInfo, showSuccess } = useAppModal();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [savedMachines, setSavedMachines] = useState<SavedMachine[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());
  const [selectedBadge, setSelectedBadge] = useState<{
    badge: Badge;
    progress: { current: number; required: number };
    isEarned: boolean;
  } | null>(null);
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  type SortMode = 'distance' | 'xp';
  const [sortMode, setSortMode] = useState<SortMode>('distance');

  // Reset image error whenever the profile avatar URL changes so new avatars are attempted
  useEffect(() => {
    setImageError(false);
  }, [profile?.avatar_url]);

  async function getUserLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUserLocation(null);
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.warn('Failed to get user location:', error);
      setUserLocation(null);
    }
  }

  // Refresh data when tab is focused (e.g., after saving a machine)
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
    }, [user])
  );

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
        quality: 1, // Get full quality for processing
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingAvatar(true);
        // Reset error state on new upload attempt
        setImageError(false);
        const asset = result.assets[0];
        const fileName = `avatar_${Date.now()}.jpg`;
        
        // Process avatar (resize and compress)
        const processedUri = await processAvatar(asset.uri);

        const publicUrl = await uploadAvatar(user.id, {
          uri: processedUri,
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

  // Fetch user's saved machines
  async function loadSavedMachines() {
    if (!user) return;
    const machines = await fetchSavedMachines();
    setSavedMachines(machines);
    setLoadingSaved(false);
  }

  // Handle unsave action
  async function handleUnsave(machineId: string) {
    try {
      await unsaveMachine(machineId);
      removeSaved(machineId);
      setSavedMachines(prev => prev.filter(m => m.machine_id !== machineId));
    } catch (err) {
      showError(t('common.error'), t('machine.unsaveError'));
    }
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
        last_verified_at: saved.machine.last_verified_at || '',
      },
    });
  }

  // Navigate to map focused on machine
  function handleShowOnMap(machine: SavedMachine['machine']) {
    router.push({
      pathname: '/(tabs)',
      params: {
        focusLat: String(machine.latitude),
        focusLng: String(machine.longitude),
        focusMachineId: machine.id,
      },
    });
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchBadges(), fetchAllBadges(), loadSavedMachines(), loadPendingRequestCount(), loadFriends(), getUserLocation()]);
    setRefreshing(false);
  }, [user]);

  function handleLogout() {
    showConfirm(t('profile.logoutConfirm.title'), t('profile.logoutConfirm.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: async () => {
          await unregisterPushNotificationsAsync();
          await supabase.auth.signOut();
        },
      },
    ]);
  }

  function handleRemoveFriend(friendId: string) {
    const friend = friends.find((f) => f.id === friendId);
    showConfirm(
      t('friends.remove'),
      t('friends.removeFriendConfirm', { name: friend?.display_name || friend?.username }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => {
            removeFriend(friendId);
          },
        },
      ]
    );
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

              await unregisterPushNotificationsAsync();

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

  function getEstimatedXP(machineId: string): number {
    if (visitedMachineIds.has(machineId)) {
      return XP_VALUES.PHOTO_UPLOAD;
    }
    return XP_VALUES.PHOTO_UPLOAD + XP_VALUES.VERIFY_MACHINE;
  }

  function formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  const sortedSavedMachines = useMemo(() => {
    const mapped = savedMachines.map((saved) => {
      const distance = userLocation
        ? calculateDistance(
            userLocation.lat,
            userLocation.lng,
            saved.machine.latitude,
            saved.machine.longitude
          )
        : null;
      const xp = getEstimatedXP(saved.machine_id);
      return { saved, distance, xp };
    });

    mapped.sort((a, b) => {
      if (sortMode === 'distance') {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      }
      // Sort by XP descending, break ties by distance ascending
      if (b.xp !== a.xp) return b.xp - a.xp;
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    return mapped;
  }, [savedMachines, userLocation, sortMode, visitedMachineIds]);

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
              <Ionicons name="settings-outline" size={ICON_SIZES.sm} color="#666" />
            </Pressable>
            <Pressable onPress={handleEditAvatar} style={styles.avatarContainer} disabled={uploadingAvatar}>
              <UserAvatar
                url={profile?.avatar_url ? `${profile.avatar_url.split('?')[0]}?t=${avatarTimestamp}` : null}
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
            <Text style={styles.displayName}>
              {profile?.display_name || profile?.username || t('common.user')}
            </Text>
            
            {/* XP and Level Bar */}
            <XPProgressBar xp={profile?.xp || 0} />

            {profile?.bio && <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>}

            {/* Stats Banner */}
            <View style={styles.statsBanner}>
              <View style={styles.statsBannerColumn}>
                <Image source={pixelStatAdded} style={styles.statsBannerIcon} />
                <View style={styles.statsBannerLabelContainer}>
                  <Text style={styles.statsBannerLabel} includeFontPadding={false}>{t('profile.machinesAdded')}</Text>
                </View>
                <Text style={styles.statsBannerNumber} includeFontPadding={false}>{profile?.contribution_count || 0}</Text>
              </View>
              <View style={styles.statsBannerDivider} />
              <View style={styles.statsBannerColumn}>
                <Image source={pixelStatBadges} style={styles.statsBannerIcon} />
                <View style={styles.statsBannerLabelContainer}>
                  <Text style={styles.statsBannerLabel} includeFontPadding={false}>{t('profile.badges')}</Text>
                </View>
                <Text style={styles.statsBannerNumber} includeFontPadding={false}>{profile?.badge_count || 0}</Text>
              </View>
              <View style={styles.statsBannerDivider} />
              <View style={styles.statsBannerColumn}>
                <Image source={pixelStatVisits} style={styles.statsBannerIcon} />
                <View style={styles.statsBannerLabelContainer}>
                  <Text style={styles.statsBannerLabel} includeFontPadding={false}>{t('profile.machinesVisited')}</Text>
                </View>
                <Text style={styles.statsBannerNumber} includeFontPadding={false}>{profile?.visit_count || 0}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quest Log Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Image source={pixelBookmark} style={[{ width: ICON_SIZES.sm, height: ICON_SIZES.sm }, styles.sectionTitleIcon]} />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('profile.questLog')}</Text>
            </View>
            {savedMachines.length > 0 && (
              <View style={styles.sortToggle}>
                <Pressable
                  style={[styles.sortButton, sortMode === 'distance' && styles.sortButtonActive]}
                  onPress={() => setSortMode('distance')}
                >
                  <Ionicons
                    name="navigate-outline"
                    size={ICON_SIZES.xs}
                    color={sortMode === 'distance' ? '#fff' : '#666'}
                  />
                  <Text style={[styles.sortButtonText, sortMode === 'distance' && styles.sortButtonTextActive]}>
                    {t('profile.sortDistance')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.sortButton, sortMode === 'xp' && styles.sortButtonActive]}
                  onPress={() => setSortMode('xp')}
                >
                  <Ionicons
                    name="flash-outline"
                    size={ICON_SIZES.xs}
                    color={sortMode === 'xp' ? '#fff' : '#666'}
                  />
                  <Text style={[styles.sortButtonText, sortMode === 'xp' && styles.sortButtonTextActive]}>
                    {t('profile.sortXP')}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
          {loadingSaved ? (
            <ActivityIndicator color="#FF4B4B" style={styles.badgeLoader} />
          ) : savedMachines.length === 0 ? (
            <View style={styles.emptyBadges}>
              <Image source={pixelEmptyQuest} style={styles.emptyImage} />
              <Text style={styles.emptyText}>{t('profile.noQuestLog')}</Text>
              <Text style={styles.emptySubtext}>
                {t('profile.questLogHint')}
              </Text>
            </View>
          ) : (
            <View style={styles.savedList}>
              {sortedSavedMachines.map(({ saved, distance, xp }) => (
                <Pressable
                  key={saved.id}
                  style={styles.savedCard}
                  onPress={() => goToMachine(saved)}
                >
                  <View style={styles.savedPhotoContainer}>
                    {saved.machine.primary_photo_url ? (
                      <Image
                        source={{ uri: saved.machine.primary_photo_url }}
                        style={[styles.savedPhoto, styles.savedPhotoWithImage]}
                      />
                    ) : (
                      <View style={[styles.savedPhoto, styles.savedPhotoPlaceholder]}>
                        <Ionicons name="image-outline" size={ICON_SIZES.md} color="#ccc" />
                      </View>
                    )}
                  </View>
                  {visitedMachineIds.has(saved.machine_id) && (
                    <VisitedStamp size="small" />
                  )}
                  <View style={styles.savedInfo}>
                    <View style={styles.savedNameRow}>
                      <Text style={styles.savedName} numberOfLines={1}>
                        {saved.machine.name || t('machine.unnamed')}
                      </Text>
                    </View>
                    <View style={styles.savedAddressRow}>
                      <Image source={pixelLocation} style={{ width: ICON_SIZES.xs, height: ICON_SIZES.xs, opacity: 0.5 }} />
                      <Text style={styles.savedAddress} numberOfLines={1}>
                        {saved.machine.address || t('machine.noAddress')}
                      </Text>
                    </View>
                    <View style={styles.savedStatsRow}>
                      <View style={styles.savedStat}>
                        <Ionicons name="flash" size={ICON_SIZES.xs} color="#D97706" />
                        <Text style={styles.savedStatText}>
                          {t('profile.xpEstimate', { xp })}
                        </Text>
                      </View>
                      {distance !== null && (
                        <>
                          <Text style={styles.savedStatDivider}>•</Text>
                          <View style={styles.savedStat}>
                            <Ionicons name="navigate" size={ICON_SIZES.xs} color="#3C91E6" />
                            <Text style={styles.savedStatText}>
                              {t('machine.away', { distance: formatDistance(distance) })}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.cardActionButton}
                      onPress={() => handleUnsave(saved.machine_id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.remove')}
                    >
                      <Image source={pixelBookmark} style={{ width: ICON_SIZES.md, height: ICON_SIZES.md }} />
                    </Pressable>
                    <Pressable
                      style={styles.cardActionButton}
                      onPress={() => handleShowOnMap(saved.machine)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t('discover.showOnMap')}
                    >
                      <Image source={require('../../assets/pixel-tab-map.png')} style={{ width: ICON_SIZES.md, height: ICON_SIZES.md }} />
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="trophy-outline" size={ICON_SIZES.sm} color="#D97706" style={styles.sectionTitleIcon} />
            <Text style={styles.sectionTitle}>{t('profile.badges')}</Text>
          </View>
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
                setSelectedBadge({ badge, progress, isEarned: false });
              }}
              onEarnedBadgePress={(earnedBadge) => {
                const fullBadge = allBadges.find((b) => b.id === earnedBadge.id);
                if (!fullBadge) return;
                
                setSelectedBadge({ 
                  badge: fullBadge, 
                  progress: { current: 0, required: 0 }, 
                  isEarned: true 
                });
              }}
            />
          )}
        </View>

        {/* Friends Section */}
        <View style={styles.section}>
          <View style={styles.friendsSectionHeader}>
            <View style={[styles.sectionTitleRow, { marginBottom: 0 }]}>
              <Ionicons name="people-outline" size={ICON_SIZES.sm} color="#3C91E6" style={styles.sectionTitleIcon} />
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{t('friends.yourFriends')}</Text>
            </View>
            <Pressable
              style={styles.addFriendButton}
              onPress={() => setFriendsModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t('friends.addFriend')}
            >
              <Ionicons name="person-add" size={ICON_SIZES.xs} color="#fff" />
              <Text style={styles.addFriendButtonText}>{t('friends.addFriend')}</Text>
              {pendingRequestCount > 0 && (
                <View style={styles.requestCountBadge}>
                  <Text style={styles.requestCountText}>
                    {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
          {friends.length === 0 ? (
            <View style={styles.emptyBadges}>
              <Image source={pixelEmptyFriends} style={styles.emptyImage} />
              <Text style={styles.emptyText}>{t('friends.noFriends')}</Text>
              <Text style={styles.emptySubtext}>{t('friends.noFriendsHint')}</Text>
            </View>
          ) : (
            <View style={styles.friendsList}>
              {friends.slice(0, 3).map((friend) => (
                <FriendCard key={friend.id} friend={friend} onRemove={handleRemoveFriend} />
              ))}
              {friends.length > 3 && (
                <Text style={styles.moreFriendsText}>
                  {t('friends.andMore', { count: friends.length - 3 })}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Support Us Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Image source={pixelHeart} style={[{ width: ICON_SIZES.sm, height: ICON_SIZES.sm }, styles.sectionTitleIcon]} />
            <Text style={styles.sectionTitle}>{t('profile.supportUs')}</Text>
          </View>
          <View style={styles.supportContainer}>
            <Image source={pixelCoffee} style={styles.coffeeImage} />
            <Text style={styles.supportText}>{t('profile.supportDescription')}</Text>
            <Pressable
              style={styles.supportButton}
              onPress={() => {
                const supportUrl = 'https://buymeacoffee.com/jidou.navi';
                Linking.openURL(supportUrl).catch(() => {
                  showInfo(t('profile.supportUs'), t('profile.supportLinkError'));
                });
              }}
              accessibilityRole="button"
              accessibilityLabel={t('profile.supportButton')}
            >
              <Image source={pixelHeart} style={{ width: ICON_SIZES.sm, height: ICON_SIZES.sm, tintColor: '#fff' }} />
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
        onProfileUpdate={(newProfile) => {
          setProfile(newProfile);
        }}
      />
      {/* Badge Requirement Modal */}
      <BadgeRequirementModal
        badge={selectedBadge?.badge || null}
        userProgress={selectedBadge?.progress || { current: 0, required: 0 }}
        isEarned={selectedBadge?.isEarned}
        visible={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />

      {/* Friends Modal */}
      <FriendsModal
        visible={friendsModalVisible}
        onClose={() => setFriendsModalVisible(false)}
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
  username: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: '#999',
    marginBottom: 12,
  },
  bio: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter',
    color: '#444',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  statsDashboard: {
    marginBottom: 24,
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
    width: ICON_SIZES.xl,
    height: ICON_SIZES.xl,
  },
  statsBannerLabelContainer: {
    height: SPACING.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBannerLabel: {
    fontSize: FONT_SIZES.xs,
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
    fontSize: FONT_SIZES.sm,
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
  coffeeImage: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 8,
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
  emptyImage: {
    width: 120,
    height: 120,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.md,
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
  savedPhotoContainer: {
    position: 'relative',
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
    fontSize: FONT_SIZES.lg,
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
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: '#999',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sortToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  sortButtonActive: {
    backgroundColor: '#FF4B4B',
  },
  sortButtonText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  savedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  savedStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  savedStatText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  savedStatDivider: {
    fontSize: FONT_SIZES.xs,
    color: '#ccc',
  },
  cardActions: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
    marginLeft: 8,
  },
  cardActionButton: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3C91E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 2,
  },
  addFriendButtonText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  requestCountBadge: {
    backgroundColor: '#FF4B4B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  requestCountText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter-Bold',
    color: '#fff',
  },
  friendsList: {
    gap: 10,
  },
  moreFriendsText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  supportContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  supportText: {
    fontSize: FONT_SIZES.md,
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
    fontSize: FONT_SIZES.lg,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
});