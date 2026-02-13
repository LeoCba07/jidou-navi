// Preview card shown when user taps a machine pin
import { useMemo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { NearbyMachine } from '../lib/machines';
import { useVisitedMachinesStore } from '../store/visitedMachinesStore';
import { COLORS } from '../theme/constants';
import VisitedStamp from './machine/VisitedStamp';

const CATEGORY_ICONS: Record<string, any> = {
  eats: require('../../assets/pixel-cat-eats.png'),
  gachapon: require('../../assets/pixel-cat-gachapon.png'),
  weird: require('../../assets/pixel-cat-weird.png'),
  retro: require('../../assets/pixel-cat-retro.png'),
  'local-gems': require('../../assets/pixel-cat-local-gems.png'),
};

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

  // Compute last seen text and color once (memoized)
  const lastSeenInfo = useMemo(() => {
    if (!machine.last_verified_at) {
      return { text: t('machine.neverVerified'), color: COLORS.indigo };
    }

    const lastSeen = new Date(machine.last_verified_at);
    // Validate parsed date - treat invalid dates as never verified
    if (isNaN(lastSeen.getTime())) {
      return { text: t('machine.neverVerified'), color: COLORS.indigo };
    }
    
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    // Determine color based on freshness
    let color: string = COLORS.warning; // Stale (>90 days) - orange
    if (diffDays <= 30) color = COLORS.success; // Fresh - green
    else if (diffDays <= 90) color = COLORS.secondary; // Moderate - blue

    // Determine text
    let text: string;
    if (diffDays > 0) {
      text = t('machine.lastSeenDays', { count: diffDays });
    } else if (diffHours > 0) {
      text = t('machine.lastSeenHours', { count: diffHours });
    } else {
      text = t('machine.lastSeenNow');
    }

    return { text, color };
  }, [machine.last_verified_at, t]);

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
                  {CATEGORY_ICONS[cat.slug] && (
                    <Image source={CATEGORY_ICONS[cat.slug]} style={styles.categoryIcon} />
                  )}
                  <Text style={styles.categoryText}>{cat.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Image source={require('../../assets/pixel-ui-location.png')} style={{ width: 14, height: 14, tintColor: COLORS.primary }} />
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
                color={lastSeenInfo.color}
              />
              <Text style={[styles.statTextMuted, { color: lastSeenInfo.color }]} numberOfLines={1}>
                {lastSeenInfo.text}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  categoryIcon: {
    width: 12,
    height: 12,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    columnGap: 10,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
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
