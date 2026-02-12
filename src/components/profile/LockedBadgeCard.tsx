// LockedBadgeCard - displays a locked badge with progress indicator
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Badge } from '../../lib/badges';
import { useBadgeTranslation } from '../../hooks/useBadgeTranslation';

interface LockedBadgeCardProps {
  badge: Badge;
  progress: number; // 0-100 percentage
  onPress: () => void;
}

export default function LockedBadgeCard({ badge, progress, onPress }: LockedBadgeCardProps) {
  const { getBadgeTranslation } = useBadgeTranslation();
  const translation = getBadgeTranslation(badge.slug, badge.name, badge.description);

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.lockOverlay}>
        <Ionicons name="lock-closed" size={14} color="#999" />
      </View>

      {badge.icon_url ? (
        <Image source={{ uri: badge.icon_url }} style={styles.icon} />
      ) : (
        <View style={styles.iconPlaceholder}>
          <Ionicons name="trophy" size={24} color="#ccc" />
        </View>
      )}

      <Text style={styles.name} numberOfLines={1}>
        {translation.name}
      </Text>

      {/* Mini progress bar */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    backgroundColor: '#fff',
    borderRadius: 2,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 1,
    opacity: 0.6,
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 36,
    height: 36,
    marginBottom: 8,
    opacity: 0.5,
  },
  iconPlaceholder: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#9CA3AF',
    borderRadius: 2,
  },
});
