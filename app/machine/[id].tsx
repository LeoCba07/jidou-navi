// Machine detail screen
import { useState, useEffect, useRef, useMemo } from 'react';
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
import { useMachinesCacheStore } from '../../src/store/machinesCacheStore';
import { checkAndAwardBadges } from '../../src/lib/badges';
import { addXP, XP_VALUES } from '../../src/lib/xp';
import { saveMachine, unsaveMachine, fetchMachinePhotos, calculateDistance, reportMachine, fetchMachineById, fetchMachineVisitors, type MachineVisitor } from '../../src/lib/machines';
import type { NearbyMachine, ReportReason } from '../../src/lib/machines';
import { uploadPhoto } from '../../src/lib/storage';
import { reverseGeocode, formatCoordinatesAsLocation } from '../../src/lib/geocoding';
import { tryRequestAppReview } from '../../src/lib/review';
import { useAppModal } from '../../src/hooks/useAppModal';
import { ImageSkeleton } from '../../src/components/ImageSkeleton';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS, MODAL_SEQUENCE_DELAY_MS, FONT_SIZES, ICON_SIZES } from '../../src/theme/constants';
import type { ShareCardData } from '../../src/components/ShareableCard';
import UserAvatar from '../../src/components/UserAvatar';
import VisitedStamp from '../../src/components/machine/VisitedStamp';

const CATEGORY_ICONS: Record<string, any> = {
  eats: require('../../assets/pixel-cat-eats.png'),
  gachapon: require('../../assets/pixel-cat-gachapon.png'),
  weird: require('../../assets/pixel-cat-weird.png'),
  retro: require('../../assets/pixel-cat-retro.png'),
  'local-gems': require('../../assets/pixel-cat-local-gems.png'),
};

const pixelBookmark = require('../../assets/pixel-ui-bookmark.png');
const pixelLocation = require('../../assets/pixel-ui-location.png');
const pixelDiscover = require('../../assets/pixel-tab-discover.png');
const pixelShare = require('../../assets/pixel-ui-share.png');

import { ReportModal } from '../../src/components/machine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper for modal sequences
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function MachineDetailScreen() {
  const { t } = useTranslation();
  const { user, profile } = useAuthStore();
  const { savedMachineIds, addSaved, removeSaved } = useSavedMachinesStore();
  const { addVisited } = useVisitedMachinesStore();
  const showBadgePopup = useUIStore((state) => state.showBadgePopup);
  const showShareCard = useUIStore((state) => state.showShareCard);
  const { showError, showSuccess, showConfirm } = useAppModal();
  const clearCache = useMachinesCacheStore((state) => state.clearCache);
  const [checkingIn, setCheckingIn] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [visitCheckDone, setVisitCheckDone] = useState(false);
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
  const [geocodedAddress, setGeocodedAddress] = useState<string | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [machineData, setMachineData] = useState<NearbyMachine | null>(null);
  const [visitors, setVisitors] = useState<MachineVisitor[]>([]);
  const [loadingVisitors, setLoadingVisitors] = useState(true);

  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    description?: string;
    address?: string;
    latitude?: string;
    longitude?: string;
    distance_meters?: string;
    primary_photo_url?: string;
    visit_count?: string;
    verification_count?: string;
    last_verified_at?: string;
    status?: string;
    categories?: string;
  }>();

  // Initialize loading state to true if we don't have basic data yet
  const [isLoadingData, setIsLoadingData] = useState(!params.name || params.name === '[id]');

  // Load machine data if missing (Deep Linking)
  useEffect(() => {
    async function loadMissingData() {
      if (!params.id) return;
      
      // If we already have the name, we don't STRICTLY need to fetch, 
      // but for deep links we usually don't.
      if (params.name && params.name.length > 0 && params.name !== '[id]') {
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      try {
        const data = await fetchMachineById(params.id);
        if (data) {
          setMachineData(data);
        } else {
          showError(t('common.error'), t('map.fetchError'));
          router.replace('/(tabs)');
        }
      } catch (err) {
        console.error('[DeepLink] Error loading deep linked machine:', err);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadMissingData();
  }, [params.id, params.name]);

  // Consolidate data into a single source of truth for the UI
  const displayData = useMemo(() => {
    // Helper to check if a param value is valid/useful
    const isValid = (val: any) => val && typeof val === 'string' && val !== 'undefined' && val !== 'null' && val !== '[id]' && val.length > 0;

    const useFetchResult = !isValid(params.name);

    if (useFetchResult && machineData) {
      return {
        name: machineData.name || '',
        description: machineData.description || '',
        latitude: machineData.latitude?.toString() || '',
        longitude: machineData.longitude?.toString() || '',
        distance_meters: machineData.distance_meters?.toString() || '0',
        primary_photo_url: machineData.primary_photo_url || '',
        visit_count: machineData.visit_count?.toString() || '0',
        last_verified_at: machineData.last_verified_at || '',
        categories: machineData.categories || [],
      };
    }

    return {
      name: params.name || '',
      description: params.description || '',
      latitude: params.latitude || '',
      longitude: params.longitude || '',
      distance_meters: params.distance_meters || '0',
      primary_photo_url: params.primary_photo_url || '',
      visit_count: params.visit_count || '0',
      last_verified_at: params.last_verified_at || '',
      categories: params.categories ? JSON.parse(params.categories) : [],
    };
  }, [params, machineData]);

  // Map individual constants for easier usage in existing JSX
  const { 
    name, 
    description, 
    latitude, 
    longitude, 
    primary_photo_url: primaryPhotoUrl, 
    last_verified_at: lastVerifiedAt 
  } = displayData;
  
  const initialDistance = displayData.distance_meters;
  const initialVisitCount = displayData.visit_count;
  const categories = displayData.categories;

  const isVisited = useVisitedMachinesStore((state) => state.isVisited(params.id));

  useEffect(() => {
    if (params.id && name) {
      Analytics.track('machine_view', {
        machine_id: params.id,
        machine_name: name,
      });
    }
  }, [params.id, name]);

  // Calculate distance if missing (e.g. coming from Profile/Bookmarks or Deep Link)
  useEffect(() => {
    let isMounted = true;

    async function calculateMissingDistance() {
      // Only calculate if distance is 0 or missing, and we have target coordinates
      if ((!initialDistance || initialDistance === '0') && latitude && longitude) {
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
              Number(latitude),
              Number(longitude)
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
  }, [initialDistance, latitude, longitude]);

  // Reverse geocode when address is missing but coordinates exist
  useEffect(() => {
    let isMounted = true;

    async function fetchAddress() {
      // Only reverse geocode if no address and we have coordinates
      const currentAddress = params.address || (machineData?.address);
      if (!currentAddress && latitude && longitude) {
        try {
          const result = await reverseGeocode(
            Number(latitude),
            Number(longitude)
          );
          if (isMounted && result.address) {
            setGeocodedAddress(result.address);
          } else if (isMounted) {
            // Fallback to formatted coordinates
            setGeocodedAddress(
              formatCoordinatesAsLocation(Number(latitude), Number(longitude))
            );
          }
        } catch (error) {
          console.log('Error reverse geocoding:', error);
          // Fallback to formatted coordinates
          if (isMounted) {
            setGeocodedAddress(
              formatCoordinatesAsLocation(Number(latitude), Number(longitude))
            );
          }
        }
      }
    }

    fetchAddress();

    return () => {
      isMounted = false;
    };
  }, [params.address, machineData?.address, latitude, longitude]);

  // Initialize and fetch photos in a single effect to avoid race conditions
  useEffect(() => {
    let isMounted = true;

    async function loadPhotos() {
      // Seed with primary photo if available
      if (primaryPhotoUrl) {
        setPhotos([primaryPhotoUrl]);
      }

      const fetchedPhotos = await fetchMachinePhotos(params.id);
      if (!isMounted) {
        return;
      }

      // If no photos were fetched and no primary photo, clear the array
      if (fetchedPhotos.length === 0) {
        if (!primaryPhotoUrl) {
          setPhotos([]);
        }
        // Otherwise keep the primary photo that was seeded
        return;
      }

      let finalPhotos = fetchedPhotos;

      // Ensure primary photo is present and first, without duplication
      if (primaryPhotoUrl) {
        const primary = primaryPhotoUrl;
        const withoutPrimary = fetchedPhotos.filter((p) => p !== primary);
        finalPhotos = [primary, ...withoutPrimary];
      }

      setPhotos(finalPhotos);
    }

    loadPhotos();

    return () => {
      isMounted = false;
    };
  }, [params.id, primaryPhotoUrl]);

  // Fetch recent visitors
  useEffect(() => {
    let isMounted = true;
    async function loadVisitors() {
      const data = await fetchMachineVisitors(params.id, 5);
      if (isMounted) {
        setVisitors(data);
        setLoadingVisitors(false);
      }
    }
    loadVisitors();
    return () => { isMounted = false; };
  }, [params.id]);

  // Use local state for visit count so it updates after check-in
  const displayVisitCount = visitCount ?? Number(initialVisitCount || 0);

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

  const lastVerifiedText = formatRelativeDate(lastVerifiedAt);

  // Get freshness color based on last verified date
  const getFreshnessColor = (): string => {
    if (!lastVerifiedAt) return '#F59E0B'; // Yellow - unknown
    const date = new Date(lastVerifiedAt);
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
    if (!lastVerifiedAt) return true; // Never verified
    const date = new Date(lastVerifiedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 90;
  };

  // Check if machine is saved
  const isSaved = savedMachineIds.has(params.id);

  // Check if user already visited this machine recently
  useEffect(() => {
    async function checkUserVisit() {
      if (!user) {
        setVisitCheckDone(true);
        return;
      }

      // Get user's most recent visit to this machine
      const { data: visitData } = await supabase
        .from('visits')
        .select('visited_at')
        .eq('user_id', user.id)
        .eq('machine_id', params.id)
        .order('visited_at', { ascending: false })
        .limit(1);

      if (visitData && visitData.length > 0 && visitData[0].visited_at) {
        // Check if visit was within the last 7 days (exact 168 hours to match backend)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (new Date(visitData[0].visited_at) >= sevenDaysAgo) {
          setHasCheckedIn(true);
        }
      }
      setVisitCheckDone(true);
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
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isFullScreen]);

  const parsedDistance = Number(initialDistance);
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
    const lat = latitude;
    const lng = longitude;
    const label = encodeURIComponent(name || 'Vending Machine');

    const url = Platform.select({
      ios: `maps:?daddr=${lat},${lng}&q=${label}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
    });

    if (url) Linking.openURL(url);
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  async function handleCopyAddress() {
    const addressToCopy = params.address || machineData?.address || geocodedAddress;
    if (addressToCopy && Clipboard?.setStringAsync) {
      try {
        await Clipboard.setStringAsync(addressToCopy);
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
      clearCache(); // Invalidate map cache so fresh data (with updated last_verified_at) is fetched

      // Refresh visitors list so current user appears
      fetchMachineVisitors(params.id, 5).then(setVisitors);

      // If user reported machine as gone, record it for auto-flagging
      if (!stillExists) {
        // @ts-ignore - RPC exists in DB but not in generated types
        await supabase.rpc('record_machine_gone_report', {
          p_machine_id: params.id,
        });
      }

      // Add XP - both YES and NO are considered verifications (+25 XP)
      const earnedXP = XP_VALUES.VERIFY_MACHINE;
      const xpResult = await addXP(
        earnedXP,
        stillExists ? 'verify_machine' : 'verify_machine_gone'
      );

      if (!xpResult.success) {
        console.warn('Failed to award XP for check-in:', xpResult.error);
      }

      Analytics.track('check_in', {
        machine_id: params.id,
        machine_name: params.name,
        still_exists: stillExists,
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
      let successMessage = stillExists
        ? t('machine.checkIn.success.stillHere')
        : t('machine.checkIn.success.gone');

      if (xpResult.success && xpResult.leveledUp) {
        successMessage = `${t('profile.levelUp', { level: xpResult.newLevel })}\n\n${successMessage}`;
      }

      showSuccess(
        t('machine.checkIn.success.title'),
        successMessage,
        async () => {
          await sleep(MODAL_SEQUENCE_DELAY_MS);

          if (stillExists) {
            if (newBadges.length > 0) {
              showBadgePopup(newBadges, async () => {
                await sleep(MODAL_SEQUENCE_DELAY_MS);
                showShareCard({
                  ...shareData,
                  onDismiss: () => tryRequestAppReview(),
                });
              });
            } else {
              showShareCard({
                ...shareData,
                onDismiss: () => tryRequestAppReview(),
              });
            }
          } else if (newBadges.length > 0) {
            // Machine reported gone - no share card, but show badge popup if earned
            showBadgePopup(newBadges, () => tryRequestAppReview());
          } else {
            tryRequestAppReview();
          }
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

      let photoSuccessMsg = t('machine.photoAdded');
      if (xpResult.success && xpResult.leveledUp) {
        photoSuccessMsg = `${t('profile.levelUp', { level: xpResult.newLevel })}\n\n${photoSuccessMsg}`;
      }

      showSuccess(t('common.success'), photoSuccessMsg, () => {
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

  async function handleReport(reason: ReportReason, details?: string) {
    setReportSubmitting(true);
    try {
      const result = await reportMachine(params.id, reason, details);
      
      if (result.success) {
        setReportModalVisible(false);
        showSuccess(t('common.success'), t('report.success'));
        Analytics.track('machine_reported', {
          machine_id: params.id,
          reason,
        });
      } else {
        // Handle specific errors
        switch (result.error) {
          case 'already_reported':
            showError(t('common.error'), t('report.errors.alreadyReported'));
            break;
          case 'rate_limited':
            showError(t('common.error'), t('report.errors.rateLimited'));
            break;
          default:
            showError(t('common.error'), t('report.errors.generic'));
        }
      }
    } catch (error) {
      console.error('Report error:', error);
      Sentry.captureException(error, {
        tags: { context: 'machine_report' },
        extra: { machineId: params.id, reason }
      });
      showError(t('common.error'), t('report.errors.generic'));
    } finally {
      setReportSubmitting(false);
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

  if (isLoadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
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

          {/* Visited stamp */}
          {(isVisited || hasCheckedIn) && <VisitedStamp />}
        </View>

        {/* Title Card */}
        <View style={styles.titleCard}>
          <View style={styles.titleRow}>
            <Text style={[styles.name, { flex: 1 }]}>{name || t('machine.unnamed')}</Text>
            <Pressable
              style={styles.flagButton}
              onPress={() => setReportModalVisible(true)}
              accessibilityLabel={t('report.title')}
              accessibilityRole="button"
            >
              <Ionicons name="flag-outline" size={ICON_SIZES.xs} color={COLORS.primary} />
            </Pressable>
          </View>

          {/* Categories */}
          {categories.length > 0 && (
            <View style={styles.categoriesRow}>
              {categories.map((cat: any) => (
                <View
                  key={cat.id}
                  style={[styles.categoryChip, { backgroundColor: cat.color }]}
                >
                  {CATEGORY_ICONS[cat.slug] && (
                    <Image source={CATEGORY_ICONS[cat.slug]} style={styles.categoryIcon} />
                  )}
                  <Text style={styles.categoryText}>{cat.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Distance pill */}
          <View style={styles.distancePill}>
            <Image source={pixelLocation} style={{ width: ICON_SIZES.xs, height: ICON_SIZES.xs }} />
            <Text style={styles.distanceText}>{t('machine.away', { distance })}</Text>
          </View>

          {/* Description */}
          {description ? (
            <Text style={styles.titleDescription}>{description}</Text>
          ) : null}
        </View>

        {/* Location Card */}
        {(params.address || geocodedAddress) && (
          <View style={styles.section}>
            <View style={styles.locationCardColumn}>
              <View style={styles.locationCardRow}>
                <View style={styles.addressContent}>
                  <Image source={pixelLocation} style={{ width: ICON_SIZES.sm, height: ICON_SIZES.sm, opacity: 0.6 }} />
                  <View style={styles.addressTextContainer}>
                    <Text style={styles.address}>{params.address || geocodedAddress}</Text>
                    {!params.address && geocodedAddress && (
                      <Text style={styles.estimatedLabel}>{t('machine.estimatedAddress')}</Text>
                    )}
                  </View>
                </View>
                {Clipboard?.setStringAsync && (params.address || geocodedAddress) && (
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
              <View style={styles.locationDivider} />
              <View style={styles.visitCountRow}>
                <View style={styles.statusItem}>
                  <Ionicons name="eye-outline" size={ICON_SIZES.xs} color={COLORS.textMuted} />
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
          </View>
        )}

        {/* Recent Activity */}
        {!loadingVisitors && visitors.length > 0 && (
          <View style={styles.section}>
            <View style={styles.activityHeader}>
              <Image source={pixelDiscover} style={{ width: ICON_SIZES.sm, height: ICON_SIZES.sm, opacity: 0.5 }} />
              <Text style={styles.activityTitle}>{t('machine.recentActivity')}</Text>
            </View>
            <View style={styles.activityCard}>
              {visitors.map((visitor) => {
                const time = formatRelativeDate(visitor.visited_at);
                return (
                  <Pressable
                    key={visitor.user_id}
                    style={styles.activityRow}
                    onPress={() => router.push(`/profile/${visitor.user_id}`)}
                    accessibilityRole="button"
                  >
                    <UserAvatar
                      url={visitor.avatar_url}
                      size={ICON_SIZES.lg}
                      borderWidth={2}
                      borderColor={COLORS.primary}
                    />
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName} numberOfLines={1}>
                        {visitor.display_name || visitor.username || 'Anonymous'}
                      </Text>
                      {time && (
                        <Text style={styles.activityTime}>
                          {t('machine.visitedTimeAgo', { time })}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          {/* Primary action - Check-In / Verify */}
          <Pressable
            style={[
              styles.checkInButton,
              hasCheckedIn && styles.checkInButtonVisited,
            ]}
            onPress={handleCheckIn}
            disabled={checkingIn || hasCheckedIn || !visitCheckDone}
            accessibilityRole="button"
            accessibilityLabel={
              hasCheckedIn
                ? t('machine.visited')
                : shouldShowVerifyPrompt()
                  ? (!lastVerifiedAt ? t('machine.beFirstToVerify') : t('machine.verifyNow'))
                  : t('machine.iVisited')
            }
          >
            {checkingIn ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={styles.primaryButtonContent}>
                <Ionicons
                  name={hasCheckedIn ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  size={ICON_SIZES.sm}
                  color="#fff"
                />
                <Text style={styles.primaryButtonText}>
                  {hasCheckedIn
                    ? t('machine.visited')
                    : shouldShowVerifyPrompt()
                      ? (!lastVerifiedAt ? t('machine.beFirstToVerify') : t('machine.verifyNow'))
                      : t('machine.iVisited')}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Secondary actions */}
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
                  <Image source={pixelBookmark} style={{ width: ICON_SIZES.sm, height: ICON_SIZES.sm, opacity: isSaved ? 1 : 0.4 }} />
                  <Text style={[styles.secondaryButtonText, isSaved && styles.savedText]} numberOfLines={1}>
                    {isSaved ? t('common.saved') : t('common.save')}
                  </Text>
                </View>
              )}
            </Pressable>
            {(isVisited || hasCheckedIn) && (
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
                    <Ionicons name="camera-outline" size={ICON_SIZES.sm} color={COLORS.text} />
                    <Text style={styles.secondaryButtonText} numberOfLines={1}>{t('machine.addPhoto')}</Text>
                  </View>
                )}
              </Pressable>
            )}
            <Pressable
              style={styles.secondaryButton}
              onPress={openDirections}
              accessibilityRole="button"
              accessibilityLabel={t('machine.getDirections')}
            >
              <View style={styles.buttonContent}>
                <Image source={pixelShare} style={{ width: ICON_SIZES.sm, height: ICON_SIZES.sm }} />
                <Text style={styles.secondaryButtonText} numberOfLines={1}>{t('machine.getDirections')}</Text>
              </View>
            </Pressable>
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

      {/* Report Modal */}
      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReport}
        isSubmitting={reportSubmitting}
      />
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
    fontSize: FONT_SIZES.md,
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
    borderRadius: BORDER_RADIUS.pixel,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.pixel,
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
    borderRadius: BORDER_RADIUS.pixel,
  },
  photoCountText: {
    color: '#fff',
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.button,
  },
  noPhoto: {
    backgroundColor: COLORS.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
  },
  noPhotoText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.button,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  flagButton: {
    padding: SPACING.xs,
    marginTop: 2,
  },
  name: {
    fontSize: FONT_SIZES.xxl,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.pixel,
  },
  categoryIcon: {
    width: ICON_SIZES.xs,
    height: ICON_SIZES.xs,
  },
  categoryText: {
    fontSize: FONT_SIZES.sm,
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
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.primary,
  },
  titleDescription: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    lineHeight: 22,
    marginTop: SPACING.md,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statusText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
  statusDivider: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginHorizontal: SPACING.sm,
  },
  freshnessDot: {
    width: 12,
    height: 12,
    borderRadius: BORDER_RADIUS.pixel,
  },
  // Sections
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xxl,
  },
  // Location Card
  locationCardColumn: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.pixel,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    ...SHADOWS.pixel,
  },
  locationCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  locationDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: SPACING.md,
  },
  visitCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  addressContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  addressTextContainer: {
    flex: 1,
  },
  address: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  estimatedLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.body,
    color: COLORS.primary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  copyButton: {
    backgroundColor: COLORS.backgroundDark,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.pixel,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  copyButtonText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.button,
    color: COLORS.text,
  },
  // Actions
  actions: {
    padding: SPACING.lg,
    paddingBottom: 60,
    gap: SPACING.lg,
    marginTop: SPACING.xxl,
  },
  checkInButton: {
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.pixel,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#1A9D48',
    ...SHADOWS.pixelLarge,
  },
  checkInButtonVisited: {
    backgroundColor: '#16A34A',
    borderColor: '#15803D',
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: FONT_SIZES.lg,
    fontFamily: FONTS.button,
  },
  primaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
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
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.button,
    textAlign: 'center',
  },
  savedButton: {
    backgroundColor: '#FEF2F2',
    borderColor: COLORS.primary,
  },
  buttonContent: {
    alignItems: 'center',
    gap: 2,
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
    borderRadius: BORDER_RADIUS.pixel,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
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
    borderRadius: BORDER_RADIUS.pixel,
  },
  fullScreenPaginationText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.button,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  activityTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.pixel,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
    gap: SPACING.md,
    ...SHADOWS.pixel,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text,
  },
  activityTime: {
    fontSize: FONT_SIZES.xs,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
});
