// Preview card shown when user taps a machine pin
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { NearbyMachine } from '../lib/machines';
import { useVisitedMachinesStore } from '../store/visitedMachinesStore';
import { COLORS, VERIFICATION_THRESHOLD } from '../theme/constants';

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
  const isActive = machine.status === 'active';
  const isVerified = (machine.verification_count || 0) >= VERIFICATION_THRESHOLD;

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
          {isVisited && (
            <View style={styles.visitedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            </View>
          )}
        </View>

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
                name={isVerified ? 'shield-checkmark' : isActive ? 'checkmark-circle' : 'help-circle'}
                size={14}
                color={isVerified ? COLORS.secondary : isActive ? COLORS.success : COLORS.warning}
              />
              <Text style={[styles.statTextMuted, isVerified ? styles.verifiedText : isActive ? styles.activeText : styles.unknownText]}>
                {isVerified 
                  ? t('machine.verifications', { count: machine.verification_count }) 
                  : isActive ? t('machine.active') : t('machine.unverified')}
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
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#FF4B4B',
  },
  visitedBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 2,
    borderWidth: 2,
    borderColor: '#fff',
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
  activeText: {
    color: COLORS.success,
  },
  verifiedText: {
    color: COLORS.secondary,
  },
  unknownText: {
    color: COLORS.warning,
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
