// Machine detail screen
import { View, Text, Image, ScrollView, Pressable, StyleSheet, Linking, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function MachineDetailScreen() {
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
              <Text style={styles.statValue}>{params.visit_count || '0'}</Text>
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
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>I Visited</Text>
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
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
  },
});
