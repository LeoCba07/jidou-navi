// Map screen - shows Mapbox map with machine pins
import { useEffect, useState, useRef, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Mapbox, { Camera, LocationPuck, MapView, ShapeSource, CircleLayer } from '@rnmapbox/maps';
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
  const markerPressedRef = useRef<boolean>(false);

  // Category filter state from Zustand
  const selectedCategories = useUIStore((state) => state.selectedCategories);

  // Filter machines by selected categories
  const filteredMachines = useMemo(() => {
    console.log('🔍 Filter: selectedCategories =', selectedCategories);
    const filtered = filterMachinesByCategories(machines, selectedCategories);
    console.log('📍 Rendering pins:', filtered.length, 'out of', machines.length, 'machines');
    if (filtered.length !== machines.length) {
      console.log('⚠️  Filter removed', machines.length - filtered.length, 'machines');
    }
    return filtered;
  }, [machines, selectedCategories]);

  // Convert machines to GeoJSON for ShapeSource (more stable than MarkerView)
  const machinesGeoJSON = useMemo(() => {
    const features = filteredMachines.map((machine) => ({
      type: 'Feature' as const,
      id: machine.id,
      geometry: {
        type: 'Point' as const,
        coordinates: [machine.longitude, machine.latitude],
      },
      properties: {
        id: machine.id,
        name: machine.name,
      },
    }));

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [filteredMachines]);

  // Clear selected machine if it's no longer visible after filtering
  useEffect(() => {
    if (!selectedMachine) return;

    const stillVisible = filteredMachines.some(
      (machine) => machine.id === selectedMachine.id
    );

    if (!stillVisible) {
      console.log('⚠️ Selected machine no longer visible, clearing selection');
      console.log('   Machine was:', selectedMachine.name);
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
    console.log('🔍 Loading machines for:', { lat, lng });
    try {
      const data = await fetchNearbyMachines(lat, lng);
      console.log('✓ Fetched machines:', data.length);
      setMachines(data);
    } catch (error) {
      console.error('❌ Error loading machines:', error);
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
    // Don't clear if a marker was just pressed
    if (markerPressedRef.current) {
      console.log('🚫 Ignoring map press - marker was tapped');
      markerPressedRef.current = false;
      return;
    }
    console.log('🗺️ Map background tapped - clearing selection');
    setSelectedMachine(null);
  }

  // Handle marker press from ShapeSource
  function handleShapePress(event: any) {
    if (!event.features || event.features.length === 0) return;

    const feature = event.features[0];
    const machineId = feature.properties.id;

    console.log('📌 Marker pressed via ShapeSource:', feature.properties.name);

    const machine = filteredMachines.find(m => m.id === machineId);
    if (machine) {
      markerPressedRef.current = true;
      setSelectedMachine(machine);
    }
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
        onPress={handleMapPress}
      >
        <Camera
          ref={cameraRef}
          centerCoordinate={[center.longitude, center.latitude]}
          zoomLevel={14}
        />
        <LocationPuck puckBearing="heading" puckBearingEnabled />

        {/* Machine pins using ShapeSource (more stable than MarkerView) */}
        <ShapeSource
          id="machines"
          shape={machinesGeoJSON}
          onPress={handleShapePress}
        >
          <CircleLayer
            id="machine-circles"
            style={{
              circleRadius: 12,
              circleColor: '#FF4B4B',
              circleStrokeWidth: 3,
              circleStrokeColor: '#ffffff',
            }}
          />
        </ShapeSource>
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
