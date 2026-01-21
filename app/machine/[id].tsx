// Machine detail screen
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
  ActivityIndicator,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore, useSavedMachinesStore, useUIStore } from '../../src/store';
import { checkAndAwardBadges } from '../../src/lib/badges';
import { saveMachine, unsaveMachine, fetchMachinePhotos } from '../../src/lib/machines';
import { useAppModal } from '../../src/hooks/useAppModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Constants for full-screen modal behavior
const MODAL_SCROLL_DELAY_MS = 100;

export default function MachineDetailScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { savedMachineIds, addSaved, removeSaved } = useSavedMachinesStore();
  const showBadgePopup = useUIStore((state) => state.showBadgePopup);
  const { showError, showSuccess, showConfirm } = useAppModal();
  const [checkingIn, setCheckingIn] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const fullScreenScrollViewRef = useRef<ScrollView>(null);

  const params = useLocalSearchParams<{
    id: string;
    name: string;
    description: string;
    address: string;
    latitude: string;
    longitude: string;
    distance_meters: string;
    primary_photo_url: string;
    visit_count: string;
    status: string;
    categories: string;
  }>();

  // Initialize photos with primary one
  useEffect(() => {
    if (params.primary_photo_url) {
      setPhotos([params.primary_photo_url]);
    }
  }, [params.primary_photo_url]);

  // Fetch all photos
  useEffect(() => {
    async function loadPhotos() {
      const fetchedPhotos = await fetchMachinePhotos(params.id);
      if (fetchedPhotos.length > 0) {
        // If we already have primary, make sure we don't duplicate it if it's in the list
        // Ideally the API handles order, but let's just use the full list from API
        setPhotos(fetchedPhotos);
      }
    }
    loadPhotos();
  }, [params.id]);

  // Use local state for visit count so it updates after check-in
  const displayVisitCount = visitCount ?? Number(params.visit_count || 0);

  // Parse categories from JSON string
  const categories = params.categories ? JSON.parse(params.categories) : [];
  const isActive = params.status === 'active';

  // Check if machine is saved
  const isSaved = savedMachineIds.has(params.id);

  // Check if user already visited this machine recently (within 3 days)
  useEffect(() => {
    async function checkRecentVisit() {
      if (!user) return;

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data } = await supabase
        .from('visits')
        .select('id')
        .eq('user_id', user.id)
        .eq('machine_id', params.id)
        .gte('visited_at', threeDaysAgo.toISOString())
        .limit(1);

      if (data && data.length > 0) {
        setHasCheckedIn(true);
      }
    }

    checkRecentVisit();
  }, [user, params.id]);

  // Scroll to the active photo when full-screen modal opens
  // Note: Only depends on isFullScreen, not activePhotoIndex, because:
  // - We want to sync scroll position only when modal opens
  // - activePhotoIndex updates as user scrolls in the modal (via handleScroll)
  // - Including activePhotoIndex would cause unwanted scrolling during user interaction
  useEffect(() => {
    if (isFullScreen && fullScreenScrollViewRef.current) {
      // Use a small delay to ensure the modal is fully rendered before scrolling
      const timer = setTimeout(() => {
        fullScreenScrollViewRef.current?.scrollTo({
          x: activePhotoIndex * SCREEN_WIDTH,
          y: 0,
          animated: false,
        });
      }, MODAL_SCROLL_DELAY_MS);

      return () => clearTimeout(timer);
    }
  }, [isFullScreen]);

  const distance = Number(params.distance_meters) < 1000
    ? `${Math.round(Number(params.distance_meters))}m`
    : `${(Number(params.distance_meters) / 1000).toFixed(1)}km`;

  function openDirections() {
    const lat = params.latitude;
    const lng = params.longitude;
    const label = encodeURIComponent(params.name || 'Vending Machine');

    const url = Platform.select({
      ios: `maps:?daddr=${lat},${lng}&q=${label}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
    });

    if (url) Linking.openURL(url);
  }

  async function handleSaveToggle() {
    if (!user) {
      showError(t('machine.loginRequired'), t('machine.loginToSave'));
      return;
    }

    setSaving(true);

    // Capture the current state before optimistic update
    const wasSaved = isSaved;

    try {
      if (wasSaved) {
        // Optimistic update - remove from store immediately
        removeSaved(params.id);
        const success = await unsaveMachine(params.id);
        if (!success) {
          // Revert on failure
          addSaved(params.id);
          showError(t('common.error'), t('machine.unsaveError'));
        }
      } else {
        // Optimistic update - add to store immediately
        addSaved(params.id);
        const success = await saveMachine(params.id);
        if (!success) {
          // Revert on failure
          removeSaved(params.id);
          showError(t('common.error'), t('machine.saveError'));
        }
      }
    } catch (err) {
      // Revert optimistic update on unexpected error
      if (wasSaved) {
        // Originally saved: we removed optimistically, so add back
        addSaved(params.id);
      } else {
        // Originally not saved: we added optimistically, so remove
        removeSaved(params.id);
      }
      showError(t('common.error'), t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  function handleCheckIn() {
    if (!user) {
      showError(t('machine.loginRequired'), t('machine.loginToCheckIn'));
      return;
    }

    // Ask if machine still exists
    showConfirm(
      t('machine.checkIn.title'),
      t('machine.checkIn.question'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('machine.checkIn.noGone'),
          style: 'destructive',
          onPress: () => performCheckIn(false),
        },
        {
          text: t('machine.checkIn.yesHere'),
          style: 'primary',
          onPress: () => performCheckIn(true),
        },
      ]
    );
  }

  async function performCheckIn(stillExists: boolean) {
    setCheckingIn(true);

    try {
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showError(t('common.error'), t('machine.checkIn.locationRequired'));
        setCheckingIn(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Call the create_visit RPC
      const { data, error } = await supabase.rpc('create_visit', {
        p_machine_id: params.id,
        p_user_lat: location.coords.latitude,
        p_user_lng: location.coords.longitude,
        p_still_exists: stillExists,
        p_max_distance_meters: 200, // Allow 200m radius
      });

      if (error) {
        // Check for specific error messages
        if (error.message.includes('too far')) {
          showError(
            t('machine.checkIn.tooFar.title'),
            t('machine.checkIn.tooFar.message')
          );
        } else if (error.message.includes('already visited')) {
          showError(t('machine.checkIn.alreadyVisited.title'), t('machine.checkIn.alreadyVisited.message'));
          setHasCheckedIn(true); // Disable button since already visited
        } else {
          showError(t('common.error'), error.message);
        }
        setCheckingIn(false);
        return;
      }

      // Success! Update the visit count and disable button
      setVisitCount(displayVisitCount + 1);
      setHasCheckedIn(true);

      // Small delay to allow profile counts to update via DB trigger
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check for badge unlocks
      const newBadges = await checkAndAwardBadges(params.id);

      // Show success message, then badge popup if earned
      showSuccess(
        t('machine.checkIn.success.title'),
        stillExists
          ? t('machine.checkIn.success.stillHere')
          : t('machine.checkIn.success.gone'),
        () => {
          if (newBadges.length > 0) {
            showBadgePopup(newBadges);
          }
        }
      );
    } catch (err) {
      showError(t('common.error'), t('common.error'));
    } finally {
      setCheckingIn(false);
    }
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    setActivePhotoIndex(roundIndex);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← {t('common.back')}</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* Photo Carousel */}
        <View style={styles.carouselContainer}>
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              style={styles.carousel}
            >
              {photos.map((photoUrl, index) => (
                <Pressable
                  key={index}
                  onPress={() => setIsFullScreen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('machine.viewPhotoFullScreen', 'View image in full screen')}
                >
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.photo, styles.noPhoto]}>
              <Text style={styles.noPhotoText}>{t('machine.noPhoto')}</Text>
            </View>
          )}

          {/* Pagination Dots */}
          {photos.length > 1 && (
            <View style={styles.pagination}>
              {photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === activePhotoIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name}>{params.name || t('machine.unnamed')}</Text>

          {/* Categories */}
          {categories.length > 0 && (
            <View style={styles.categoriesRow}>
              {categories.map((cat: any) => (
                <View
                  key={cat.id}
                  style={[styles.categoryChip, { backgroundColor: cat.color }]}
                >
                  <Text style={styles.categoryText}>{cat.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="location" size={16} color="#FF4B4B" />
              <Text style={styles.statDistance}>{t('machine.away', { distance })}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={16} color="#666" />
              <Text style={styles.statText}>{t('machine.visits', { count: displayVisitCount })}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name={isActive ? 'checkmark-circle' : 'help-circle'}
                size={16}
                color={isActive ? '#22C55E' : '#F59E0B'}
              />
              <Text style={[styles.statText, isActive ? styles.activeText : styles.unknownText]}>
                {isActive ? t('machine.active') : t('machine.unverified')}
              </Text>
            </View>
          </View>

          {params.address && (
            <View style={styles.addressRow}>
              <Ionicons name="map-outline" size={16} color="#666" />
              <Text style={styles.address}>{params.address}</Text>
            </View>
          )}

          {params.description && (
            <Text style={styles.description}>{params.description}</Text>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={openDirections}>
            <Text style={styles.primaryButtonText}>{t('machine.getDirections')}</Text>
          </Pressable>

          <View style={styles.secondaryActions}>
            <Pressable
              style={[
                styles.secondaryButton,
                (checkingIn || hasCheckedIn) && styles.buttonDisabled,
              ]}
              onPress={handleCheckIn}
              disabled={checkingIn || hasCheckedIn}
            >
              {checkingIn ? (
                <ActivityIndicator size="small" color="#333" />
              ) : (
                <Text style={styles.secondaryButtonText}>
                  {hasCheckedIn ? t('machine.visited') + ' ✓' : t('machine.iVisited')}
                </Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, saving && styles.buttonDisabled]}
              onPress={handleSaveToggle}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#333" />
              ) : (
                <View style={styles.saveButtonContent}>
                  <Ionicons
                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={18}
                    color={isSaved ? '#FF4B4B' : '#333'}
                  />
                  <Text style={[styles.secondaryButtonText, isSaved && styles.savedText]}>
                    {isSaved ? t('common.saved') : t('common.save')}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isFullScreen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          StatusBar.setHidden(false);
          setIsFullScreen(false);
        }}
      >
        <View style={styles.fullScreenContainer}>
          <StatusBar hidden />
          <Pressable
            style={styles.closeButton}
            onPress={() => {
              StatusBar.setHidden(false);
              setIsFullScreen(false);
            }}
            accessibilityLabel="Close full screen viewer"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          
          <ScrollView
            ref={fullScreenScrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.fullScreenCarousel}
          >
            {photos.map((photoUrl, index) => (
              <View key={index} style={styles.fullScreenPhotoContainer}>
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.fullScreenPhoto}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.fullScreenPagination}>
            <Text style={styles.fullScreenPaginationText}>
              {activePhotoIndex + 1} / {photos.length}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    color: '#FF4B4B',
  },
  content: {
    flex: 1,
  },
  carouselContainer: {
    position: 'relative',
  },
  carousel: {
    height: 250,
  },
  photo: {
    width: SCREEN_WIDTH,
    height: 250,
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 20,
  },
  noPhoto: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
  },
  noPhotoText: {
    color: '#999',
    fontSize: 16,
  },
  info: {
    padding: 16,
  },
  name: {
    fontSize: 14,
    fontFamily: 'PressStart2P',
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 2,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDistance: {
    fontSize: 14,
    color: '#FF4B4B',
    fontWeight: '600',
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  activeText: {
    color: '#22C55E',
  },
  unknownText: {
    color: '#F59E0B',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  address: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  description: {
    fontSize: 15,
    fontFamily: 'Inter',
    color: '#444',
    lineHeight: 22,
  },
  actions: {
    padding: 16,
    paddingBottom: 60,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#FF4B4B',
    paddingVertical: 16,
    borderRadius: 2,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#CC3C3C',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savedText: {
    color: '#FF4B4B',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  fullScreenCarousel: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  fullScreenPhotoContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenPhoto: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  fullScreenPagination: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  fullScreenPaginationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
