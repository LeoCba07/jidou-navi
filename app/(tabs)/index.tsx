// Map screen - shows Mapbox map with machine pins
import { useEffect, useState, useRef, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Mapbox, { Camera, LocationPuck, MapView, MarkerView } from '@rnmapbox/maps';
import { router } from 'expo-router';
import { fetchNearbyMachines, filterMachinesByCategories, NearbyMachine, SearchResult } from '../../src/lib/machines';
import { MachinePreviewCard } from '../../src/components/MachinePreviewCard';
import { SearchBar } from '../../src/components/SearchBar';
import { CategoryFilterBar } from '../../src/components/CategoryFilterBar';
import { useUIStore } from '../../src/store';

// Initialize Mapbox with token from env
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '');

// Default center: Tokyo
const TOKYO = { latitude: 35.6762, longitude: 139.6503 };

export default function MapScreen() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [machines, setMachines] = useState<NearbyMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<NearbyMachine | null>(null);
  const mapRef = useRef<MapView>(null);
  const cameraRef = useRef<Camera>(null);
  const regionChangeTimeout = useRef<NodeJS.Timeout | null>(null);

  // Category filter state from Zustand
  const selectedCategories = useUIStore((state) => state.selectedCategories);

  // Filter machines by selected categories
  const filteredMachines = useMemo(() => {
    return filterMachinesByCategories(machines, selectedCategories);
  }, [machines, selectedCategories]);

  // Clear selected machine if it's no longer visible after filtering
  useEffect(() => {
    if (!selectedMachine) return;

    const stillVisible = filteredMachines.some(
      (machine) => machine.id === selectedMachine.id
    );

    if (!stillVisible) {
      setSelectedMachine(null);
    }
  }, [filteredMachines, selectedMachine]);

  // Get user location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
      setLoading(false);
    })();
  }, []);

  // Fetch machines when location is available
  useEffect(() => {
    if (location) {
      loadMachines(location.latitude, location.longitude);
    }
  }, [location]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (regionChangeTimeout.current) {
        clearTimeout(regionChangeTimeout.current);
      }
    };
  }, []);

  // Fetch machines from Supabase
  async function loadMachines(lat: number, lng: number) {
    try {
      const data = await fetchNearbyMachines(lat, lng);
      setMachines(data);
    } catch (error) {
      console.error('Error loading machines:', error);
      // Don't clear existing machines - keep showing what we have
      // This provides graceful degradation when offline
    }
  }

  // Reload machines when map stops moving (with debouncing)
  async function handleRegionChange() {
    // Clear previous timeout
    if (regionChangeTimeout.current) {
      clearTimeout(regionChangeTimeout.current);
    }

    // Set new timeout to fetch machines after 500ms of no movement
    regionChangeTimeout.current = setTimeout(async () => {
      if (!mapRef.current) return;
      const center = await mapRef.current.getCenter();
      if (center) {
        loadMachines(center[1], center[0]); // [lng, lat] -> lat, lng
      }
    }, 500);
  }

  // Close preview when tapping on empty map area
  function handleMapPress() {
    setSelectedMachine(null);
  }

  // Center map on user's current location
  function centerOnUser() {
    if (!location || !cameraRef.current) return;
    cameraRef.current.setCamera({
      centerCoordinate: [location.longitude, location.latitude],
      zoomLevel: 14,
      animationDuration: 1000,
    });
  }

  // Handle search result selection - center map on result
  function handleSearchResult(result: SearchResult) {
    if (!cameraRef.current) return;
    // Clear any open preview card
    setSelectedMachine(null);
    cameraRef.current.setCamera({
      centerCoordinate: [result.longitude, result.latitude],
      zoomLevel: 16,
      animationDuration: 1000,
    });
    // Reload machines around the selected location
    loadMachines(result.latitude, result.longitude);
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#FF4B4B" />
      </View>
    );
  }

  const center = location || TOKYO;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        onRegionDidChange={handleRegionChange}
        onPress={(event) => {
          // Ignore presses on rendered features (markers) to prevent conflict with marker handlers
          if (event && Array.isArray((event as any).features) && (event as any).features.length > 0) {
            return;
          }
          handleMapPress();
        }}
      >
        <Camera
          ref={cameraRef}
          centerCoordinate={[center.longitude, center.latitude]}
          zoomLevel={14}
        />
        <LocationPuck puckBearing="heading" puckBearingEnabled />

        {/* Machine pins */}
        {filteredMachines.map((machine) => (
          <MarkerView
            key={machine.id}
            coordinate={[machine.longitude, machine.latitude]}
          >
            <Pressable onPress={() => setSelectedMachine(machine)}>
              <View style={styles.pin} />
            </Pressable>
          </MarkerView>
        ))}
      </MapView>

      {/* Search bar */}
      <SearchBar onResultSelect={handleSearchResult} />

      {/* Category filter bar */}
      <CategoryFilterBar />

      {/* Recenter button */}
      <Pressable style={styles.recenterButton} onPress={centerOnUser}>
        <Ionicons name="locate" size={24} color="#333" />
      </Pressable>

      {/* Preview card */}
      {selectedMachine && (
        <MachinePreviewCard
          machine={selectedMachine}
          onPress={() => {
            router.push({
              pathname: '/machine/[id]',
              params: {
                id: selectedMachine.id,
                name: selectedMachine.name || '',
                description: selectedMachine.description || '',
                address: selectedMachine.address || '',
                latitude: String(selectedMachine.latitude),
                longitude: String(selectedMachine.longitude),
                distance_meters: String(selectedMachine.distance_meters),
                primary_photo_url: selectedMachine.primary_photo_url || '',
                visit_count: String(selectedMachine.visit_count),
                status: selectedMachine.status || '',
              },
            });
          }}
          onClose={() => setSelectedMachine(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4B4B',
    borderWidth: 3,
    borderColor: 'white',
  },
  recenterButton: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
