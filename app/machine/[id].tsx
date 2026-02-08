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
// Clipboard with fallback for dev builds where native module may not be available
let Clipboard: { setStringAsync?: (text: string) => Promise<boolean> } | null = null;
try {
  Clipboard = require('expo-clipboard');
} catch {
  // expo-clipboard not available in this build
}
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/lib/supabase';
import { Analytics } from '../../src/lib/analytics';
import { Sentry } from '../../src/lib/sentry';
import { useAuthStore, useSavedMachinesStore, useVisitedMachinesStore, useUIStore } from '../../src/store';
import { checkAndAwardBadges } from '../../src/lib/badges';
import { addXP, XP_VALUES } from '../../src/lib/xp';
import { saveMachine, unsaveMachine, fetchMachinePhotos, calculateDistance } from '../../src/lib/machines';
import { uploadPhoto } from '../../src/lib/storage';
import { tryRequestAppReview } from '../../src/lib/review';
import { useAppModal } from '../../src/hooks/useAppModal';
import { ImageSkeleton } from '../../src/components/ImageSkeleton';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../../src/theme/constants';
import type { ShareCardData } from '../../src/components/ShareableCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Constants for full-screen modal behavior
const MODAL_SCROLL_DELAY_MS = 100;

export default function MachineDetailScreen() {
  const { t } = useTranslation();
  const { user, profile } = useAuthStore();
  const { savedMachineIds, addSaved, removeSaved } = useSavedMachinesStore();
  const { addVisited } = useVisitedMachinesStore();
  const showBadgePopup = useUIStore((state) => state.showBadgePopup);
  const showShareCard = useUIStore((state) => state.showShareCard);
  const { showError, showSuccess, showConfirm } = useAppModal();
  const [checkingIn, setCheckingIn] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [liveDistance, setLiveDistance] = useState<number | null>(null);
  const fullScreenScrollViewRef = useRef<ScrollView>(null);
  const [addressCopied, setAddressCopied] = useState(false);

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
    verification_count: string;
    last_verified_at: string;
    status: string;
    categories: string;
  }>();

  useEffect(() => {
    if (params.id) {
      Analytics.track('machine_view', {
        machine_id: params.id,
        machine_name: params.name,
      });
    }
  }, [params.id]);

  // Calculate distance if missing (e.g. coming from Profile/Bookmarks)
  useEffect(() => {
    let isMounted = true;

    async function calculateMissingDistance() {
      // Only calculate if distance is 0 or missing, and we have target coordinates
      if ((!params.distance_meters || params.distance_meters === '0') && params.latitude && params.longitude) {
        try {
          // Check permissions first
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;

          // Try to get last known position first (faster)
          let location = await Location.getLastKnownPositionAsync({});
          
          // If no last known position, request current position
          if (!location) {
            location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
          }

          if (location && isMounted) {
            const dist = calculateDistance(
              location.coords.latitude,
              location.coords.longitude,
              Number(params.latitude),
              Number(params.longitude)
            );
            setLiveDistance(dist);
          }
        } catch (error) {
          console.log('Error calculating distance:', error);
        }
      }
    }

    calculateMissingDistance();

    return () => {
      isMounted = false;
    };
  }, [params.distance_meters, params.latitude, params.longitude]);

  // Initialize and fetch photos in a single effect to avoid race conditions
  useEffect(() => {
    let isMounted = true;

    async function loadPhotos() {
      // Seed with primary photo if available
      if (params.primary_photo_url) {
        setPhotos([params.primary_photo_url]);
      }

      const fetchedPhotos = await fetchMachinePhotos(params.id);
      if (!isMounted) {
        return;
      }

      // If no photos were fetched and no primary photo, clear the array
      if (fetchedPhotos.length === 0) {
        if (!params.primary_photo_url) {
          setPhotos([]);
        }
        // Otherwise keep the primary photo that was seeded
        return;
      }

      let finalPhotos = fetchedPhotos;

      // Ensure primary photo is present and first, without duplication
      if (params.primary_photo_url) {
        const primary = params.primary_photo_url;
        const withoutPrimary = fetchedPhotos.filter((p) => p !== primary);
        finalPhotos = [primary, ...withoutPrimary];
      }

      setPhotos(finalPhotos);
    }

    loadPhotos();

    return () => {
      isMounted = false;
    };
  }, [params.id, params.primary_photo_url]);

  // Use local state for visit count so it updates after check-in
  const displayVisitCount = visitCount ?? Number(params.visit_count || 0);

  // Format relative date for last verified
  const formatRelativeDate = (dateString: string | undefined): string | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const lastVerifiedText = formatRelativeDate(params.last_verified_at);

  // Get freshness color based on last verified date
  const getFreshnessColor = (): string => {
    if (!params.last_verified_at) return '#F59E0B'; // Yellow - unknown
    const date = new Date(params.last_verified_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) return '#22C55E'; // Green - fresh
    if (diffDays <= 90) return '#F59E0B'; // Yellow - getting stale
    return '#EF4444'; // Red - stale
  };

  const freshnessColor = getFreshnessColor();

  // Check if should show re-verification prompt (>90 days since last verified and user hasn't checked in)
  const shouldShowVerifyPrompt = (): boolean => {
    if (hasCheckedIn) return false;
    if (!params.last_verified_at) return true; // Never verified
    const date = new Date(params.last_verified_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 90;
  };

  // Parse categories from JSON string
  const categories = params.categories ? JSON.parse(params.categories) : [];

  // Check if machine is saved
  const isSaved = savedMachineIds.has(params.id);

  // Check if user already visited this machine recently
  useEffect(() => {
    async function checkUserVisit() {
      if (!user) return;

      // Get user's most recent visit to this machine
      const { data: visitData } = await supabase
        .from('visits')
        .select('visited_at')
        .eq('user_id', user.id)
        .eq('machine_id', params.id)
        .order('visited_at', { ascending: false })
        .limit(1);

      if (visitData && visitData.length > 0 && visitData[0].visited_at) {
        // Check if visit was within 3 days
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        if (new Date(visitData[0].visited_at) >= threeDaysAgo) {
          setHasCheckedIn(true);
        }
      }
    }

    checkUserVisit();
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

  const parsedDistance = Number(params.distance_meters);
  const displayDistance =
    (Number.isFinite(liveDistance as number) ? (liveDistance as number) : null) ??
    (Number.isFinite(parsedDistance) ? parsedDistance : null);
    
  const distance =
    displayDistance == null
      ? t('machine.calculating')
      : displayDistance < 1000
        ? `${Math.round(displayDistance)}m`
        : `${(displayDistance / 1000).toFixed(1)}km`;

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

  async function handleCopyAddress() {
    if (params.address && Clipboard?.setStringAsync) {
      try {
        await Clipboard.setStringAsync(params.address);
        setAddressCopied(true);
        setTimeout(() => setAddressCopied(false), 2000);
      } catch (error) {
        // Clipboard not available, fail silently
        console.warn('Clipboard not available:', error);
      }
    }
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

    const needsVerification = shouldShowVerifyPrompt();

    // Build the message with trust messaging
    const title = needsVerification ? t('machine.checkIn.verifyTitle') : t('machine.checkIn.title');
    const question = needsVerification ? t('machine.checkIn.verifyQuestion') : t('machine.checkIn.question');
    const message = `${question}\n\n${t('machine.checkIn.xpReward')}\n${t('machine.checkIn.trustMessage')}`;

    // Ask if machine still exists
    showConfirm(
      title,
      message,
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
    const wasVerification = shouldShowVerifyPrompt();

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
      addVisited(params.id as string); // Add to visited machines store

      // If user reported machine as gone, record it for auto-flagging
      if (!stillExists) {
        await supabase.rpc('record_machine_gone_report', {
          p_machine_id: params.id,
        });
      }

      // Add XP
      const xpResult = await addXP(
        stillExists ? XP_VALUES.VERIFY_MACHINE : XP_VALUES.CHECK_IN,
        stillExists ? 'verify_machine' : 'check_in'
      );

      if (!xpResult.success) {
        console.warn('Failed to award XP for check-in:', xpResult.error);
      }

      Analytics.track('check_in', {
        machine_id: params.id,
        machine_name: params.name,
      });

      // Small delay to allow profile counts to update via DB trigger
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check for badge unlocks
      const newBadges = await checkAndAwardBadges(params.id);

      // Prepare share card data
      const shareData: ShareCardData = {
        machineId: params.id,
        machineName: params.name || '',
        machineAddress: params.address || '',
        machinePhotoUrl: photos[0] || params.primary_photo_url || '',
        categories: categories,
      };

      // Show success message, then badge popup if earned, then share card
      const successMessage = stillExists
        ? t('machine.checkIn.success.stillHere')
        : t('machine.checkIn.success.gone');
      
      const earnedXP = stillExists ? XP_VALUES.VERIFY_MACHINE : XP_VALUES.CHECK_IN;

      showSuccess(
        t('machine.checkIn.success.title'),
        successMessage,
        () => {
          if (newBadges.length > 0) {
            // Show badge popup, then share card after dismissing
            showBadgePopup(newBadges, () => {
              showShareCard(shareData);
            });
          } else {
            // No badges - show share card directly
            showShareCard(shareData);
          }
          // Try to request app review
          tryRequestAppReview();
        },
        'OK',
        earnedXP
      );
    } catch (err) {
      showError(t('common.error'), t('common.error'));
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleAddPhoto() {
    if (!user) {
      showError(t('machine.loginRequired'), t('machine.loginToSave'));
      return;
    }

    const isDev = profile?.role === 'admin';

    // 1. Check location (unless dev)
    if (!isDev) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showError(t('common.error'), t('machine.checkIn.locationRequired'));
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      
      // Basic Haversine for client-side quick feedback
      const R = 6371e3; // metres
      const φ1 = location.coords.latitude * Math.PI/180;
      const φ2 = Number(params.latitude) * Math.PI/180;
      const Δφ = (Number(params.latitude)-location.coords.latitude) * Math.PI/180;
      const Δλ = (Number(params.longitude)-location.coords.longitude) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const d = R * c;

      if (d > 200) {
        showError(t('machine.checkIn.tooFar.title'), t('machine.checkIn.tooFar.message'));
        return;
      }
    }

    // 2. Ask user for source
    showConfirm(
      t('machine.addPhoto'),
      '',
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('addMachine.chooseFromGallery'),
          style: 'default',
          onPress: () => pickImage('gallery'),
        },
        {
          text: t('addMachine.takePhoto'),
          style: 'primary',
          onPress: () => pickImage('camera'),
        },
      ]
    );
  }

  async function pickImage(source: 'camera' | 'gallery') {
    // Check permissions
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showError(t('common.error'), t('addMachine.permissionNeeded'));
        return;
      }
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError(t('common.error'), t('addMachine.permissionNeeded'));
        return;
      }
    }

    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.5,
        allowsEditing: true,
        aspect: [4, 3],
      };

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        await uploadPhotoAction(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Sentry.captureException(error, { tags: { context: 'image_picker', source } });
      showError(t('common.error'), t('machine.uploadError'));
    }
  }

  async function uploadPhotoAction(uri: string) {
    setUploading(true);
    try {
      if (!user) return;

      const fileName = `machine_${params.id}_${Date.now()}.jpg`;
      
      // Use the storage helper
      const publicUrl = await uploadPhoto(
        user.id, 
        params.id, 
        { uri, type: 'image/jpeg', name: fileName }
      );

      const { error: insertError } = await supabase.from('machine_photos').insert({
        machine_id: params.id,
        photo_url: publicUrl,
        uploaded_by: user.id,
        status: 'active', // Assuming auto-approve for now or pending if moderation required
      });

      if (insertError) throw insertError;

      // Add XP
      const xpResult = await addXP(XP_VALUES.PHOTO_UPLOAD, 'photo_upload');
      if (!xpResult.success) {
        console.warn('Failed to award XP for photo upload:', xpResult.error);
      }

      // Update local photos state
      setPhotos(prev => [...prev, publicUrl]);
      
      Analytics.track('photo_upload', {
        machine_id: params.id,
      });

      showSuccess(t('common.success'), t('machine.photoAdded'), () => {
        tryRequestAppReview();
      }, 'OK', XP_VALUES.PHOTO_UPLOAD);

    } catch (error) {
      console.error('Upload error:', error);
      Sentry.captureException(error, { 
        tags: { context: 'photo_upload' },
        extra: { machineId: params.id }
      });
      showError(t('common.error'), t('machine.uploadError'));
    } finally {
      setUploading(false);
    }
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    // Guard against division by zero
    if (!slideSize || slideSize === 0) {
      return;
    }
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
              accessibilityLabel={t('machine.photoCarousel')}
            >
              {photos.map((photoUrl, index) => (
                <Pressable
                  key={photoUrl}
                  onPress={() => setIsFullScreen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('machine.viewPhotoFullScreen', { current: index + 1, total: photos.length })}
                >
                  <View style={styles.photoWrapper}>
                    {!loadedImages.has(photoUrl) && (
                      <ImageSkeleton style={styles.photoSkeleton} />
                    )}
                    <Image
                      source={{ uri: photoUrl }}
                      style={[
                        styles.photo,
                        !loadedImages.has(photoUrl) && styles.photoHidden,
                      ]}
                      resizeMode="cover"
                      onLoad={() => {
                        setLoadedImages(prev => new Set([...prev, photoUrl]));
                      }}
                    />
                  </View>
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
              {photos.map((photoUrl, index) => (
                <View
                  key={photoUrl}
                  style={[
                    styles.paginationDot,
                    index === activePhotoIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Photo count badge */}
          {photos.length > 1 && (
            <View style={styles.photoCountBadge}>
              <Text style={styles.photoCountText}>
                {activePhotoIndex + 1}/{photos.length}
              </Text>
            </View>
          )}
        </View>

        {/* Title Card */}
        <View style={styles.titleCard}>
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

          {/* Distance pill */}
          <View style={styles.distancePill}>
            <Ionicons name="location" size={14} color={COLORS.primary} />
            <Text style={styles.distanceText}>{t('machine.away', { distance })}</Text>
          </View>

          {/* Description */}
          {params.description && (
            <Text style={styles.titleDescription}>{params.description}</Text>
          )}
        </View>

        {/* Status Row - Simplified */}
        <View style={styles.section}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Ionicons name="eye-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.statusText}>
                {t(displayVisitCount === 1 ? 'machine.visit' : 'machine.visits', { count: displayVisitCount })}
              </Text>
            </View>
            {lastVerifiedText && (
              <>
                <Text style={styles.statusDivider}>•</Text>
                <View style={styles.statusItem}>
                  <View style={[styles.freshnessDot, { backgroundColor: freshnessColor }]} />
                  <Text style={styles.statusText}>
                    {t('machine.verifiedAgo', { time: lastVerifiedText })}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Location Card */}
        {params.address && (
          <View style={styles.section}>
            <View style={styles.locationCard}>
              <View style={styles.addressContent}>
                <Ionicons name="location-outline" size={18} color={COLORS.textMuted} />
                <Text style={styles.address}>{params.address}</Text>
              </View>
              {Clipboard?.setStringAsync && (
                <Pressable
                  style={styles.copyButton}
                  onPress={handleCopyAddress}
                  accessibilityLabel={t('machine.copyAddress')}
                >
                  <Text style={styles.copyButtonText}>
                    {addressCopied ? t('machine.addressCopied') : t('machine.copyAddress')}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Re-verification prompt for stale machines */}
        {shouldShowVerifyPrompt() && (
          <View style={styles.section}>
            <View style={styles.verifyPrompt}>
              <Ionicons name="alert-circle-outline" size={20} color="#F59E0B" />
              <Text style={styles.verifyPromptText}>{t('machine.stalePrompt')}</Text>
              <Pressable
                style={styles.verifyButton}
                onPress={handleCheckIn}
                disabled={checkingIn}
              >
                <Text style={styles.verifyButtonText}>{t('machine.verifyNow')}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          {/* Primary action - full width */}
          <Pressable style={styles.primaryButton} onPress={openDirections}>
            <Text style={styles.primaryButtonText}>{t('machine.getDirections')}</Text>
          </Pressable>

          {/* Secondary actions - three buttons */}
          <View style={styles.secondaryActions}>
            <Pressable
              style={[
                styles.secondaryButton,
                isSaved && styles.savedButton,
                saving && styles.buttonDisabled,
              ]}
              onPress={handleSaveToggle}
              disabled={saving}
              accessibilityLabel={isSaved ? t('common.unsave') : t('common.save')}
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons
                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={18}
                    color={isSaved ? COLORS.primary : COLORS.text}
                  />
                  <Text style={[styles.secondaryButtonText, isSaved && styles.savedText]}>
                    {isSaved ? t('common.saved') : t('common.save')}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              style={[
                styles.secondaryButton,
                uploading && styles.buttonDisabled,
              ]}
              onPress={handleAddPhoto}
              disabled={uploading}
              accessibilityLabel={t('machine.addPhoto')}
              accessibilityRole="button"
            >
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.text} />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="camera-outline" size={18} color={COLORS.text} />
                  <Text style={styles.secondaryButtonText}>{t('machine.addPhoto')}</Text>
                </View>
              )}
            </Pressable>
            {!shouldShowVerifyPrompt() && (
              <Pressable
                style={[
                  styles.secondaryButton,
                  (checkingIn || hasCheckedIn) && styles.buttonDisabled,
                ]}
                onPress={handleCheckIn}
                disabled={checkingIn || hasCheckedIn}
              >
                {checkingIn ? (
                  <ActivityIndicator size="small" color={COLORS.text} />
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons
                      name={hasCheckedIn ? 'checkmark-circle' : 'checkmark-circle-outline'}
                      size={18}
                      color={hasCheckedIn ? COLORS.success : COLORS.text}
                    />
                    <Text style={[styles.secondaryButtonText, hasCheckedIn && styles.visitedText]}>
                      {hasCheckedIn ? t('machine.visited') : t('machine.iVisited')}
                    </Text>
                  </View>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={isFullScreen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsFullScreen(false);
        }}
      >
        <View style={styles.fullScreenContainer}>
          <StatusBar hidden />
          <Pressable
            style={styles.closeButton}
            onPress={() => {
              setIsFullScreen(false);
            }}
            accessibilityLabel={t('accessibility.closeFullScreenViewer', 'Close full screen viewer')}
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
              <View key={photoUrl} style={styles.fullScreenPhotoContainer}>
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.fullScreenPhoto}
                  resizeMode="contain"
                  accessibilityRole="image"
                  accessibilityLabel={t('machine.photoLabel', { current: index + 1, total: photos.length })}
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
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.backgroundDark,
  },
  backButton: {
    paddingVertical: SPACING.sm,
  },
  backText: {
    fontSize: 14,
    fontFamily: FONTS.button,
    color: COLORS.primary,
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
  photoWrapper: {
    width: SCREEN_WIDTH,
    height: 250,
    position: 'relative',
  },
  photo: {
    width: SCREEN_WIDTH,
    height: 250,
  },
  photoSkeleton: {
    position: 'absolute',
    width: SCREEN_WIDTH,
    height: 250,
    zIndex: 1,
  },
  photoHidden: {
    opacity: 0,
  },
  pagination: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
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
  photoCountBadge: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  photoCountText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
  },
  noPhoto: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
  },
  noPhotoText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontFamily: FONTS.body,
  },
  // Title Card
  titleCard: {
    backgroundColor: COLORS.surface,
    margin: SPACING.lg,
    marginBottom: 0,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.pixel,
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
    ...SHADOWS.pixel,
  },
  name: {
    fontSize: 24,
    fontFamily: FONTS.title,
    color: COLORS.text,
    lineHeight: 32,
    marginBottom: SPACING.md,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  categoryChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.pixel,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: FONTS.button,
    color: '#fff',
    textTransform: 'uppercase',
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    alignSelf: 'flex-start',
  },
  distanceText: {
    fontSize: 12,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.primary,
  },
  titleDescription: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    lineHeight: 22,
    marginTop: SPACING.md,
  },
  // Status Row
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#eee',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statusText: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
  statusDivider: {
    fontSize: 13,
    color: COLORS.textLight,
    marginHorizontal: SPACING.sm,
  },
  freshnessDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Sections
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xxl,
  },
  // Location Card
  locationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  addressContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  address: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  copyButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  copyButtonText: {
    fontSize: 12,
    fontFamily: FONTS.button,
    color: COLORS.text,
  },
  // Verify Prompt
  verifyPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  verifyPromptText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.body,
    color: '#92400E',
    lineHeight: 18,
  },
  verifyButton: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  verifyButtonText: {
    fontSize: 13,
    fontFamily: FONTS.button,
    color: '#fff',
  },
  // Actions
  actions: {
    padding: SPACING.lg,
    paddingBottom: 60,
    gap: SPACING.lg,
    marginTop: SPACING.xxl,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.pixel,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primaryDark,
    ...SHADOWS.pixelLarge,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: FONTS.button,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.pixel,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    ...SHADOWS.pixel,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontFamily: FONTS.button,
  },
  savedButton: {
    backgroundColor: '#FEF2F2',
    borderColor: COLORS.primary,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  visitedText: {
    color: COLORS.success,
  },
  savedText: {
    color: COLORS.primary,
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
