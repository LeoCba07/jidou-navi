// Map screen - shows Mapbox map with machine pins
import { useEffect, useState, useRef, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Mapbox, { Camera, LocationPuck, MapView, ShapeSource, SymbolLayer, Images, CircleLayer } from '@rnmapbox/maps';
import { router, useLocalSearchParams } from 'expo-router';
import { filterMachinesByCategories, NearbyMachine, SearchResult, calculateDistance, MapBounds } from '../../src/lib/machines';
import { MachinePreviewCard } from '../../src/components/MachinePreviewCard';
import { SearchBar } from '../../src/components/SearchBar';
import { CategoryFilterBar } from '../../src/components/CategoryFilterBar';
import { useUIStore, useMachinesCacheStore } from '../../src/store';
import { useMapFetch } from '../../src/hooks/useMapFetch';
import { useTranslation } from 'react-i18next';

// Initialize Mapbox with token from env
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '');

// Default center: Tokyo
const TOKYO = { latitude: 35.6762, longitude: 139.6503 };

// Marker images for SymbolLayer
const markerImages = {
  'vending-marker': require('../../assets/marker.png'),
};

export default function MapScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ focusLat: string; focusLng: string; focusMachineId: string }>();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<NearbyMachine | null>(null);
  const mapRef = useRef<MapView>(null);
  const cameraRef = useRef<Camera>(null);
  const markerPressedRef = useRef<boolean>(false);

  // Category filter state from Zustand
  const selectedCategories = useUIStore((state) => state.selectedCategories);
  const clearCategories = useUIStore((state) => state.clearCategories);

  // Machines from cache store
  const machines = useMachinesCacheStore((state) => state.visibleMachines);
  const fetchError = useMachinesCacheStore((state) => state.fetchError);
  const clearError = useMachinesCacheStore((state) => state.clearError);

  // Map fetching hook
  const { handleRegionChange, forceFetch, cleanup } = useMapFetch();

  // Handle focus parameters from other screens (e.g., Discover)
  useEffect(() => {
    if (params.focusLat && params.focusLng && params.focusMachineId) {
      const lat = parseFloat(params.focusLat);
      const lng = parseFloat(params.focusLng);
      const id = params.focusMachineId;

      if (!isNaN(lat) && !isNaN(lng)) {
        // Reset selected machine first
        setSelectedMachine(null);
        // Clear categories so the machine is visible
        clearCategories();

        // Small delay to ensure map/camera ref is ready when switching tabs
        setTimeout(() => {
          if (cameraRef.current) {
            cameraRef.current.setCamera({
              centerCoordinate: [lng, lat],
              zoomLevel: 16,
              animationDuration: 1000,
            });
          }
        }, 100);

        // Force fetch area
        const delta = 0.01; // ~1km
        const bounds: MapBounds = {
          minLat: lat - delta,
          maxLat: lat + delta,
          minLng: lng - delta,
          maxLng: lng + delta,
        };
        forceFetch(bounds);

        // Try to select the machine with retry logic
        // We retry a few times to allow the fetch to complete
        let attempts = 0;
        const maxAttempts = 5;
        
        const trySelect = setInterval(() => {
          attempts++;
          const currentMachines = useMachinesCacheStore.getState().visibleMachines;
          const found = currentMachines.find((m) => m.id === id);
          
          if (found) {
            setSelectedMachine(found);
            clearInterval(trySelect);
          } else if (attempts >= maxAttempts) {
            clearInterval(trySelect);
            // If still not found, we could fetch individual machine details here as fallback
          }
        }, 500);
      }
    }
  }, [params.focusLat, params.focusLng, params.focusMachineId]);

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

  // Separate GeoJSON for selected marker glow effect
  const selectedMarkerGeoJSON = useMemo(() => {
    if (!selectedMachine) {
      return {
        type: 'FeatureCollection' as const,
        features: [],
      };
    }

    return {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        id: selectedMachine.id,
        geometry: {
          type: 'Point' as const,
          coordinates: [selectedMachine.longitude, selectedMachine.latitude],
        },
        properties: {
          id: selectedMachine.id,
        },
      }],
    };
  }, [selectedMachine]);

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
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch (error) {
        console.warn('Error getting user location:', error);
        // Fallback to Tokyo coordinates is handled by the component's default center when location is null
      } finally {
        setLoading(false);
      }
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

  // Retry fetching machines after an error
  async function handleRetry() {
    clearError();
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

  // Handle search result selection - center map on result and show preview
  async function handleSearchResult(result: SearchResult) {
    if (!cameraRef.current) return;

    // Clear any open preview card first
    setSelectedMachine(null);

    // Reset category filter so the searched machine is always visible
    clearCategories();

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

        {/* Gold glow ring behind selected marker */}
        <ShapeSource
          id="selected-marker-glow"
          shape={selectedMarkerGeoJSON}
        >
          <CircleLayer
            id="selected-glow-outer"
            style={{
              circleRadius: 26,
              circleColor: 'rgba(255, 215, 0, 0.3)',
              circleStrokeWidth: 0,
              circleTranslate: [0, -34],
              circleTranslateAnchor: 'viewport',
            }}
          />
          <CircleLayer
            id="selected-glow-inner"
            style={{
              circleRadius: 18,
              circleColor: 'transparent',
              circleStrokeWidth: 2.5,
              circleStrokeColor: '#FFD700',
              circleTranslate: [0, -34],
              circleTranslateAnchor: 'viewport',
            }}
          />
        </ShapeSource>

        {/* Machine pins using ShapeSource (more stable than MarkerView) */}
        <ShapeSource
          id="machines"
          shape={machinesGeoJSON}
          onPress={handleShapePress}
          hitbox={{ width: 44, height: 44 }}
        >
          <SymbolLayer
            id="machine-markers"
            style={{
              iconImage: 'vending-marker',
              iconSize: [
                'case',
                ['==', ['get', 'isSelected'], true],
                0.115,
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

      {/* Error banner */}
      {fetchError && (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={18} color="#fff" />
          <Text style={styles.errorText}>{t('map.fetchError')}</Text>
          <Pressable style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryText}>{t('map.retry')}</Text>
          </Pressable>
          <Pressable style={styles.dismissButton} onPress={clearError}>
            <Ionicons name="close" size={18} color="#fff" />
          </Pressable>
        </View>
      )}

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
                  verification_count: String(selectedMachine.verification_count || 0),
                  last_verified_at: selectedMachine.last_verified_at || '',
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
  errorBanner: {
    position: 'absolute',
    top: 140,
    left: 16,
    right: 16,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  errorText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
  },
  dismissButton: {
    padding: 4,
  },
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
    alignSelf: 'center',
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
