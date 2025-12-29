// Machine detail screen
import { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Location from 'expo-location';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/authStore';

export default function MachineDetailScreen() {
  const { user } = useAuthStore();
  const [checkingIn, setCheckingIn] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [visitCount, setVisitCount] = useState<number | null>(null);

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
  }>();

  // Use local state for visit count so it updates after check-in
  const displayVisitCount = visitCount ?? Number(params.visit_count || 0);

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

  async function handleCheckIn() {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to check in.');
      return;
    }

    // Ask if machine still exists
    Alert.alert(
      'Check In',
      'Is this vending machine still here?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'No, it\'s gone',
          style: 'destructive',
          onPress: () => performCheckIn(false),
        },
        {
          text: 'Yes, it\'s here!',
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
        Alert.alert('Location Required', 'Please enable location to check in.');
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
          Alert.alert(
            'Too Far Away',
            'You need to be closer to the vending machine to check in. Get within 200 meters and try again.'
          );
        } else if (error.message.includes('already visited')) {
          Alert.alert('Already Checked In', 'You\'ve already checked in to this machine today.');
          setHasCheckedIn(true); // Disable button since already visited
        } else {
          Alert.alert('Check-in Failed', error.message);
        }
        setCheckingIn(false);
        return;
      }

      // Success! Update the visit count and disable button
      setVisitCount(displayVisitCount + 1);
      setHasCheckedIn(true);

      Alert.alert(
        'Checked In!',
        stillExists
          ? 'Thanks for confirming this machine is still here!'
          : 'Thanks for letting us know. We\'ll verify this machine.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
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
          <Text style={styles.distance}>{distance} away</Text>

          {params.address && (
            <Text style={styles.address}>{params.address}</Text>
          )}

          {params.description && (
            <Text style={styles.description}>{params.description}</Text>
          )}

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{displayVisitCount}</Text>
              <Text style={styles.statLabel}>visits</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{params.status || 'active'}</Text>
              <Text style={styles.statLabel}>status</Text>
            </View>
          </View>
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
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Save</Text>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  distance: {
    fontSize: 16,
    color: '#FF4B4B',
    marginTop: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  description: {
    fontSize: 15,
    color: '#444',
    marginTop: 12,
    lineHeight: 22,
  },
  stats: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 24,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  actions: {
    padding: 16,
    paddingBottom: 60,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#FF4B4B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
