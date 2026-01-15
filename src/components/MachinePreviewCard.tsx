// Preview card shown when user taps a machine pin
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NearbyMachine } from '../lib/machines';

type Props = {
  machine: NearbyMachine;
  distanceMeters?: number; // Override distance (e.g., from user's actual location)
  onPress: () => void;
  onClose: () => void;
};

export function MachinePreviewCard({ machine, distanceMeters, onPress, onClose }: Props) {
  // Use override distance if provided, otherwise fall back to machine's distance
  const actualDistance = distanceMeters ?? machine.distance_meters;

  // Format distance
  const distance = actualDistance < 1000
    ? `${Math.round(actualDistance)}m`
    : `${(actualDistance / 1000).toFixed(1)}km`;

  return (
    <View style={styles.container}>
      <Pressable style={styles.card} onPress={onPress}>
        {/* Photo */}
        {machine.primary_photo_url ? (
          <Image source={{ uri: machine.primary_photo_url }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <Ionicons name="image-outline" size={40} color="#ccc" />
          </View>
        )}

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {machine.name || 'Unnamed Machine'}
          </Text>
          <View style={styles.distanceRow}>
            <Ionicons name="location" size={14} color="#FF4B4B" />
            <Text style={styles.distance}>{distance} away</Text>
          </View>
          {machine.description && (
            <Text style={styles.description} numberOfLines={2}>
              {machine.description}
            </Text>
          )}
          {/* Tap indicator */}
          <View style={styles.tapIndicator}>
            <Text style={styles.tapText}>Tap for details</Text>
            <Ionicons name="chevron-forward" size={14} color="#FF4B4B" />
          </View>
        </View>
      </Pressable>

      {/* Close button */}
      <Pressable style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={18} color="#666" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 6,
    borderWidth: 3,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#FF4B4B',
  },
  noPhoto: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2B2B2B',
    marginBottom: 4,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  distance: {
    fontSize: 13,
    color: '#FF4B4B',
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  tapIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  tapText: {
    fontSize: 12,
    color: '#FF4B4B',
    fontWeight: '500',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
});
