// Machine detail screen
import { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore, useSavedMachinesStore, useUIStore } from '../../src/store';
import { checkAndAwardBadges } from '../../src/lib/badges';
import { saveMachine, unsaveMachine } from '../../src/lib/machines';
import { useAppModal } from '../../src/hooks/useAppModal';

export default function MachineDetailScreen() {
  const { user } = useAuthStore();
  const { savedMachineIds, addSaved, removeSaved } = useSavedMachinesStore();
  const showBadgePopup = useUIStore((state) => state.showBadgePopup);
  const { showError, showSuccess, showConfirm } = useAppModal();
  const [checkingIn, setCheckingIn] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [visitCount, setVisitCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

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
      showError('Login Required', 'Please log in to save machines.');
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
          showError('Error', 'Failed to unsave machine.');
        }
      } else {
        // Optimistic update - add to store immediately
        addSaved(params.id);
        const success = await saveMachine(params.id);
        if (!success) {
          // Revert on failure
          removeSaved(params.id);
          showError('Error', 'Failed to save machine.');
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
      showError('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleCheckIn() {
    if (!user) {
      showError('Login Required', 'Please log in to check in.');
      return;
    }

    // Ask if machine still exists
    showConfirm(
      'Check In',
      'Is this vending machine still here?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: "No, it's gone",
          style: 'destructive',
          onPress: () => performCheckIn(false),
        },
        {
          text: "Yes, it's here!",
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
        showError('Location Required', 'Please enable location to check in.');
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
            'Too Far Away',
            'You need to be closer to the vending machine to check in. Get within 200 meters and try again.'
          );
        } else if (error.message.includes('already visited')) {
          showError('Already Checked In', "You've already checked in to this machine recently.");
          setHasCheckedIn(true); // Disable button since already visited
        } else {
          showError('Check-in Failed', error.message);
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
        'Checked In!',
        stillExists
          ? 'Thanks for confirming this machine is still here!'
          : "Thanks for letting us know. We'll verify this machine.",
        () => {
          if (newBadges.length > 0) {
            showBadgePopup(newBadges);
          }
        }
      );
    } catch (err) {
      showError('Error', 'Something went wrong. Please try again.');
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* Photo */}
        {params.primary_photo_url ? (
          <Image source={{ uri: params.primary_photo_url }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <Text style={styles.noPhotoText}>No photo</Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name}>{params.name || 'Unnamed Machine'}</Text>

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
              <Text style={styles.statDistance}>{distance} away</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={16} color="#666" />
              <Text style={styles.statText}>{displayVisitCount} visits</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name={isActive ? 'checkmark-circle' : 'help-circle'}
                size={16}
                color={isActive ? '#22C55E' : '#F59E0B'}
              />
              <Text style={[styles.statText, isActive ? styles.activeText : styles.unknownText]}>
                {isActive ? 'Active' : 'Unverified'}
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
            <Text style={styles.primaryButtonText}>Get Directions</Text>
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
                  {hasCheckedIn ? 'Visited ✓' : 'I Visited'}
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
                    {isSaved ? 'Saved' : 'Save'}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
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
  photo: {
    width: '100%',
    height: 250,
  },
  noPhoto: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
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
});
