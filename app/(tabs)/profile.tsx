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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../src/store/authStore';
import { useSavedMachinesStore } from '../../src/store/savedMachinesStore';
import { useLanguageStore } from '../../src/store/languageStore';
import { supabase } from '../../src/lib/supabase';
import { fetchSavedMachines, unsaveMachine, SavedMachine } from '../../src/lib/machines';
import { uploadAvatar } from '../../src/lib/storage';
import { useAppModal } from '../../src/hooks/useAppModal';
import { supportedLanguages } from '../../src/lib/i18n';

// Badge type from joined query
type UserBadge = {
  id: string;
  unlocked_at: string;
  badge: {
    id: string;
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

// Default avatar image used when user has no custom avatar
const DEFAULT_AVATAR = require('../../assets/default-avatar.jpg');

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, profile, setProfile } = useAuthStore();
  const { removeSaved } = useSavedMachinesStore();
  const { currentLanguage, showLanguageSelector } = useLanguageStore();
  const { showError, showConfirm, showInfo, showSuccess } = useAppModal();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [savedMachines, setSavedMachines] = useState<SavedMachine[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Get current language display name
  const currentLanguageName = supportedLanguages.find(l => l.code === currentLanguage)?.nativeName || 'English';

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

        // Update local state
        if (profile) {
          // Add timestamp to bust cache since we reuse the filename
          setProfile({ ...profile, avatar_url: `${publicUrl}?t=${Date.now()}` });
        }
        
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

  // Fetch user's saved machines
  async function loadSavedMachines() {
    if (!user) return;
    const data = await fetchSavedMachines();
    setSavedMachines(data);
    setLoadingSaved(false);
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
    loadSavedMachines();
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchBadges(), loadSavedMachines()]);
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
        {/* User info */}
        <View style={styles.userSection}>
          <Pressable onPress={handleEditAvatar} style={styles.avatarContainer} disabled={uploadingAvatar}>
            <Image 
              source={
                profile?.avatar_url 
                  ? { uri: `${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${profile.updated_at ? new Date(profile.updated_at).getTime() : Date.now()}` } 
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
          {profile?.bio && <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>}
          <View style={styles.emailCard}>
            <Ionicons name="mail-outline" size={16} color="#999" />
            <Text style={styles.emailText}>{user?.email}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{profile?.contribution_count || 0}</Text>
            <Text style={styles.statLabel}>{t('profile.machinesAdded')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{profile?.visit_count || 0}</Text>
            <Text style={styles.statLabel}>{t('profile.visits')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{profile?.badge_count || 0}</Text>
            <Text style={styles.statLabel}>{t('profile.badges')}</Text>
          </View>
        </View>

        {/* My Saved Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.mySaved')}</Text>
          {loadingSaved ? (
            <ActivityIndicator color="#FF4B4B" style={styles.badgeLoader} />
          ) : savedMachines.length === 0 ? (
            <View style={styles.emptyBadges}>
              <Ionicons name="bookmark-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>{t('profile.noSavedMachines')}</Text>
              <Text style={styles.emptySubtext}>
                {t('profile.savedMachinesHint')}
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
                      style={styles.savedPhoto}
                    />
                  ) : (
                    <View style={[styles.savedPhoto, styles.savedPhotoPlaceholder]}>
                      <Ionicons name="image-outline" size={24} color="#ccc" />
                    </View>
                  )}
                  <View style={styles.savedInfo}>
                    <Text style={styles.savedName} numberOfLines={1}>
                      {saved.machine.name || t('machine.unnamed')}
                    </Text>
                    <Text style={styles.savedAddress} numberOfLines={1}>
                      {saved.machine.address || t('machine.noAddress')}
                    </Text>
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
          ) : badges.length === 0 ? (
            <View style={styles.emptyBadges}>
              <Ionicons name="trophy-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>{t('profile.noBadgesYet')}</Text>
              <Text style={styles.emptySubtext}>
                {t('profile.badgesHint')}
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesScroll}
            >
              {badges.map((userBadge) => (
                <Pressable
                  key={userBadge.id}
                  style={[
                    styles.badgeItem,
                    {
                      borderColor:
                        RARITY_COLORS[userBadge.badge.rarity || 'common'] || RARITY_COLORS.common,
                    },
                  ]}
                  onPress={() =>
                    showInfo(userBadge.badge.name, userBadge.badge.description)
                  }
                >
                  {userBadge.badge.icon_url ? (
                    <Image
                      source={{ uri: userBadge.badge.icon_url }}
                      style={styles.badgeIcon}
                    />
                  ) : (
                    <View style={styles.badgeIconPlaceholder}>
                      <Ionicons name="trophy" size={24} color="#FF4B4B" />
                    </View>
                  )}
                  <Text style={styles.badgeName} numberOfLines={1}>
                    {userBadge.badge.name}
                  </Text>
                  <Text style={styles.badgeDescription} numberOfLines={2}>
                    {userBadge.badge.description}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
          <View style={styles.legalContainer}>
            <Pressable
              style={styles.legalLink}
              onPress={showLanguageSelector}
              accessibilityRole="button"
              accessibilityLabel={t('profile.language')}
            >
              <Ionicons name="language-outline" size={20} color="#666" />
              <Text style={styles.legalLinkText}>{t('profile.language')}</Text>
              <Text style={styles.languageValue}>{currentLanguageName}</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </Pressable>
          </View>
        </View>

        {/* Support Us Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.supportUs')}</Text>
          <View style={styles.supportContainer}>
            <Text style={styles.supportText}>{t('profile.supportDescription')}</Text>
            <Pressable
              style={styles.supportButton}
              onPress={() => {
                // TODO: Replace with actual Buy Me a Coffee / Ko-fi link
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

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.legal')}</Text>
          <View style={styles.legalContainer}>
            <Pressable
              style={styles.legalLink}
              onPress={() => router.push('/legal/privacy')}
              accessibilityRole="button"
              accessibilityLabel={t('profile.privacyPolicy')}
              accessibilityHint="Opens privacy policy page"
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#666" />
              <Text style={styles.legalLinkText}>{t('profile.privacyPolicy')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </Pressable>
            <View style={styles.legalDivider} />
            <Pressable
              style={styles.legalLink}
              onPress={() => router.push('/legal/terms')}
              accessibilityRole="button"
              accessibilityLabel={t('profile.termsOfService')}
              accessibilityHint="Opens terms of service page"
            >
              <Ionicons name="document-text-outline" size={20} color="#666" />
              <Text style={styles.legalLinkText}>{t('profile.termsOfService')}</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </Pressable>
          </View>
        </View>

        {/* Logout button */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF4B4B" />
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </Pressable>

        {/* Delete account button */}
        <Pressable style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>{t('profile.deleteAccount')}</Text>
        </Pressable>
      </ScrollView>
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
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
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
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#2B2B2B',
    marginBottom: 4,
  },
  username: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#999',
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#444',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9f9f9',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'center',
  },
  emailText: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 2,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 3,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eee',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FF4B4B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#666',
    textAlign: 'center',
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
  badgesScroll: {
    gap: 12,
  },
  badgeItem: {
    width: 110,
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
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  badgeIconPlaceholder: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 10,
    fontFamily: 'Inter',
    color: '#999',
    textAlign: 'center',
    lineHeight: 13,
  },
  legalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  legalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  legalLinkText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter',
    color: '#333',
  },
  languageValue: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#999',
  },
  legalDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 48,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF4B4B',
    marginBottom: 12,
  },
  logoutText: {
    fontSize: 15,
    color: '#FF4B4B',
    fontFamily: 'Silkscreen',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 40,
  },
  deleteText: {
    fontSize: 14,
    fontFamily: 'Silkscreen',
    color: '#FF4B4B',
    textDecorationLine: 'underline',
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
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
  },
  savedPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
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
  savedName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    marginBottom: 4,
  },
  savedAddress: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#666',
  },
  unsaveButton: {
    padding: 8,
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
