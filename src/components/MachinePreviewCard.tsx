// Preview card shown when user taps a machine pin
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { NearbyMachine } from '../lib/machines';
import { useVisitedMachinesStore } from '../store/visitedMachinesStore';
import { COLORS } from '../theme/constants';
import VisitedStamp from './machine/VisitedStamp';

type Props = {
  machine: NearbyMachine;
  distanceMeters?: number; // Override distance (e.g., from user's actual location)
  onPress: () => void;
  onClose: () => void;
};

export function MachinePreviewCard({ machine, distanceMeters, onPress, onClose }: Props) {
  const { t } = useTranslation();
  const isVisited = useVisitedMachinesStore((state) => state.isVisited(machine.id));

  // Use override distance if provided, otherwise fall back to machine's distance
  const actualDistance = distanceMeters ?? machine.distance_meters;

  // Format distance
  const distance = actualDistance < 1000
    ? `${Math.round(actualDistance)}m`
    : `${(actualDistance / 1000).toFixed(1)}km`;

  const categories = machine.categories || [];

  // Format last seen time
  const getLastSeenText = () => {
    if (!machine.last_verified_at) {
      return t('machine.neverVerified');
    }
    const lastSeen = new Date(machine.last_verified_at);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return t('machine.lastSeenDays', { count: diffDays });
    }
    if (diffHours > 0) {
      return t('machine.lastSeenHours', { count: diffHours });
    }
    return t('machine.lastSeenNow');
  };

  // Determine color based on freshness
  const getLastSeenColor = () => {
    if (!machine.last_verified_at) {
      return COLORS.warning; // Never verified - orange
    }
    const lastSeen = new Date(machine.last_verified_at);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30) return COLORS.success; // Fresh - green
    if (diffDays <= 90) return COLORS.secondary; // Moderate - blue
    return COLORS.warning; // Stale - orange
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.card} onPress={onPress}>
        {/* Photo */}
        <View style={styles.photoContainer}>
          {machine.primary_photo_url ? (
            <Image source={{ uri: machine.primary_photo_url }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.noPhoto]}>
              <Ionicons name="image-outline" size={40} color="#ccc" />
            </View>
          )}
        </View>

        {isVisited && <VisitedStamp size="small" />}

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {machine.name || t('machine.unnamed')}
          </Text>

          {/* Categories */}
          {categories.length > 0 && (
            <View style={styles.categoriesRow}>
              {categories.slice(0, 3).map((cat) => (
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
              <Ionicons name="location" size={14} color={COLORS.primary} />
              <Text style={styles.statText}>{distance}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.statTextMuted}>
                {t('machine.visits', { count: machine.visit_count })}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name="time-outline"
                size={14}
                color={getLastSeenColor()}
              />
              <Text style={[styles.statTextMuted, { color: getLastSeenColor() }]}>
                {getLastSeenText()}
              </Text>
            </View>
          </View>

          {/* Tap indicator */}
          <View style={styles.tapIndicator}>
            <Text style={styles.tapText}>{t('machine.tapForDetails')}</Text>
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
    bottom: 78,
    left: 16,
    right: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  photoContainer: {
    position: 'relative',
    overflow: 'hidden',
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
    paddingRight: 24,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#2B2B2B',
    marginBottom: 6,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.primary,
  },
  statTextMuted: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: COLORS.textMuted,
  },
  tapIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapText: {
    fontSize: 12,
    fontFamily: 'Silkscreen',
    color: '#FF4B4B',
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
