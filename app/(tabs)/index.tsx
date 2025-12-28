// Map screen - shows Mapbox map with machine pins
import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Mapbox, { Camera, LocationPuck, MapView, PointAnnotation } from '@rnmapbox/maps';
import { router } from 'expo-router';
import { fetchNearbyMachines, NearbyMachine } from '../../src/lib/machines';
import { MachinePreviewCard } from '../../src/components/MachinePreviewCard';

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

  // Fetch machines from Supabase
  async function loadMachines(lat: number, lng: number) {
    const data = await fetchNearbyMachines(lat, lng);
    setMachines(data);
  }

  // Reload machines when map stops moving
  async function handleRegionChange() {
    if (!mapRef.current) return;
    setSelectedMachine(null); // Close preview when panning
    const center = await mapRef.current.getCenter();
    if (center) {
      loadMachines(center[1], center[0]); // [lng, lat] -> lat, lng
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
      >
        <Camera
          ref={cameraRef}
          centerCoordinate={[center.longitude, center.latitude]}
          zoomLevel={14}
        />
        <LocationPuck puckBearing="heading" puckBearingEnabled />

        {/* Machine pins */}
        {machines.map((machine) => (
          <PointAnnotation
            key={machine.id}
            id={machine.id}
            coordinate={[machine.longitude, machine.latitude]}
            onSelected={() => setSelectedMachine(machine)}
          >
            <View style={styles.pin} />
          </PointAnnotation>
        ))}
      </MapView>

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
