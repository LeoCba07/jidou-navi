// Map screen - shows Mapbox map with machine pins
import { useEffect, useState, useRef, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Mapbox, { Camera, LocationPuck, MapView, ShapeSource, SymbolLayer, Images } from '@rnmapbox/maps';
import { router } from 'expo-router';
import { filterMachinesByCategories, NearbyMachine, SearchResult, calculateDistance, MapBounds } from '../../src/lib/machines';
import { MachinePreviewCard } from '../../src/components/MachinePreviewCard';
import { SearchBar } from '../../src/components/SearchBar';
import { CategoryFilterBar } from '../../src/components/CategoryFilterBar';
import { useUIStore, useMachinesCacheStore } from '../../src/store';
import { useMapFetch } from '../../src/hooks/useMapFetch';

// Initialize Mapbox with token from env
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '');

// Default center: Tokyo
const TOKYO = { latitude: 35.6762, longitude: 139.6503 };

// Marker images for SymbolLayer
const markerImages = {
  'vending-marker': require('../../assets/marker.png'),
};

export default function MapScreen() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<NearbyMachine | null>(null);
  const mapRef = useRef<MapView>(null);
  const cameraRef = useRef<Camera>(null);
  const markerPressedRef = useRef<boolean>(false);

  // Category filter state from Zustand
  const selectedCategories = useUIStore((state) => state.selectedCategories);

  // Machines from cache store
  const machines = useMachinesCacheStore((state) => state.visibleMachines);

  // Map fetching hook
  const { handleRegionChange, forceFetch, cleanup } = useMapFetch();

  // Filter machines by selected categories
  const filteredMachines = useMemo(() => {
    return filterMachinesByCategories(machines, selectedCategories);
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
        isSelected: selectedMachine?.id === machine.id,
      },
    }));

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [filteredMachines, selectedMachine]);

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

  // Initial fetch when map finishes loading
  async function onMapLoaded() {
    if (!mapRef.current) return;
    const bounds = await mapRef.current.getVisibleBounds();
    if (bounds) {
      const mapBounds: MapBounds = {
        minLat: Math.min(bounds[0][1], bounds[1][1]),
        maxLat: Math.max(bounds[0][1], bounds[1][1]),
        minLng: Math.min(bounds[0][0], bounds[1][0]),
        maxLng: Math.max(bounds[0][0], bounds[1][0]),
      };
      forceFetch(mapBounds);
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Handle map region change - fetch machines for new viewport
  async function onRegionDidChange() {
    if (!mapRef.current) return;

    const bounds = await mapRef.current.getVisibleBounds();

    if (bounds) {
      const mapBounds: MapBounds = {
        minLat: Math.min(bounds[0][1], bounds[1][1]),
        maxLat: Math.max(bounds[0][1], bounds[1][1]),
        minLng: Math.min(bounds[0][0], bounds[1][0]),
        maxLng: Math.max(bounds[0][0], bounds[1][0]),
      };
      handleRegionChange(mapBounds);
    }
  }

  // Close preview when tapping on empty map area
  function handleMapPress() {
    // Don't clear if a marker was just pressed
    if (markerPressedRef.current) {
      markerPressedRef.current = false;
      return;
    }
    setSelectedMachine(null);
  }

  // Handle marker press from ShapeSource
  function handleShapePress(event: any) {
    if (!event.features || event.features.length === 0) return;

    const feature = event.features[0];
    const machineId = feature.properties.id;

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

  // Handle search result selection - center map on result and show preview
  async function handleSearchResult(result: SearchResult) {
    if (!cameraRef.current) return;

    // Clear any open preview card first
    setSelectedMachine(null);

    // Center map on the selected result
    cameraRef.current.setCamera({
      centerCoordinate: [result.longitude, result.latitude],
      zoomLevel: 16,
      animationDuration: 1000,
    });

    // Force fetch machines around the selected location
    // Use a small bounding box around the search result
    const delta = 0.01; // ~1km
    const searchBounds: MapBounds = {
      minLat: result.latitude - delta,
      maxLat: result.latitude + delta,
      minLng: result.longitude - delta,
      maxLng: result.longitude + delta,
    };
    forceFetch(searchBounds);

    // Wait a moment for fetch to complete, then find and select the machine
    setTimeout(() => {
      const currentMachines = useMachinesCacheStore.getState().visibleMachines;
      const selectedFromSearch = currentMachines.find(m => m.id === result.id);
      if (selectedFromSearch) {
        setSelectedMachine(selectedFromSearch);
      } else {
        // Machine might not be in the fetched results yet - create a preview from search result
        const machineFromSearch: NearbyMachine = {
          id: result.id,
          name: result.name,
          description: result.description,
          address: result.address,
          latitude: result.latitude,
          longitude: result.longitude,
          distance_meters: 0,
          categories: null,
          primary_photo_url: '',
          status: result.status,
          visit_count: result.visit_count,
        };
        setSelectedMachine(machineFromSearch);
      }
    }, 500);
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
        onDidFinishLoadingMap={onMapLoaded}
        onMapIdle={onRegionDidChange}
        onPress={handleMapPress}
        scaleBarEnabled={false}
        compassEnabled={false}
        logoPosition={{ bottom: 1, right: 3 }}
        attributionPosition={{ bottom: 1, right: 88 }}
      >
        <Camera
          ref={cameraRef}
          centerCoordinate={[center.longitude, center.latitude]}
          zoomLevel={14}
          animationDuration={0}
        />
        <LocationPuck puckBearing="heading" puckBearingEnabled />

        {/* Preload marker image */}
        <Images images={markerImages} />

        {/* Machine pins using ShapeSource (more stable than MarkerView) */}
        <ShapeSource
          id="machines"
          shape={machinesGeoJSON}
          onPress={handleShapePress}
        >
          <SymbolLayer
            id="machine-markers"
            style={{
              iconImage: 'vending-marker',
              iconSize: [
                'case',
                ['==', ['get', 'isSelected'], true],
                0.15,
                0.1,
              ],
              iconAllowOverlap: true,
              iconAnchor: 'bottom',
              symbolSortKey: [
                'case',
                ['==', ['get', 'isSelected'], true],
                1,
                0,
              ],
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
        <Ionicons name="locate" size={28} color="#333" />
      </Pressable>

      {/* Add machine FAB */}
      <Pressable style={styles.fab} onPress={() => router.push('/add-machine')}>
        <Ionicons name="add" size={26} color="white" />
      </Pressable>

      {/* Preview card */}
      {selectedMachine && (() => {
        // Calculate actual distance from user's location
        const actualDistance = location
          ? calculateDistance(
              location.latitude,
              location.longitude,
              selectedMachine.latitude,
              selectedMachine.longitude
            )
          : selectedMachine.distance_meters;

        return (
          <MachinePreviewCard
            machine={selectedMachine}
            distanceMeters={actualDistance}
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
                  distance_meters: String(actualDistance),
                  primary_photo_url: selectedMachine.primary_photo_url || '',
                  visit_count: String(selectedMachine.visit_count),
                  status: selectedMachine.status || '',
                  categories: JSON.stringify(selectedMachine.categories || []),
                },
              });
            }}
            onClose={() => setSelectedMachine(null)}
          />
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  recenterButton: {
    position: 'absolute',
    bottom: 28,
    right: 10,
    width: 42,
    height: 42,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  fab: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#FF4B4B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#CC3C3C',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 5,
  },
});
