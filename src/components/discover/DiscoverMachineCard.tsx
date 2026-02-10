// Machine card for discover screen with engagement features
import { useEffect, useState, useRef } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { EngagedMachine, MachineVisitor } from '../../lib/machines';
import { fetchMachineVisitors, fetchMachineVisitorCount } from '../../lib/machines';
import { useVisitedMachinesStore } from '../../store/visitedMachinesStore';
import UpvoteButton, { type UpvoteButtonRef } from './UpvoteButton';
import VisitorAvatars from './VisitorAvatars';
import VisitedStamp from '../machine/VisitedStamp';

type DiscoverMachineCardProps = {
  machine: EngagedMachine;
  isUpvoted: boolean;
  isUpvoting: boolean;
  canUpvote: boolean;
  isSaved: boolean;
  isSaving: boolean;
  onUpvotePress: (machineId: string) => void;
  onSavePress: (machineId: string) => void;
  onShowOnMap: (machine: EngagedMachine) => void;
  onVisitorPress?: (machineId: string, visitors: MachineVisitor[], count: number) => void;
};

export default function DiscoverMachineCard({
  machine,
  isUpvoted,
  isUpvoting,
  canUpvote,
  isSaved,
  isSaving,
  onUpvotePress,
  onSavePress,
  onShowOnMap,
  onVisitorPress,
}: DiscoverMachineCardProps) {
  const { t } = useTranslation();
  const isVisited = useVisitedMachinesStore((state) => state.isVisited(machine.id));
  const [visitors, setVisitors] = useState<MachineVisitor[]>([]);
  const [visitorCount, setVisitorCount] = useState(0);
  const upvoteButtonRef = useRef<UpvoteButtonRef>(null);

  useEffect(() => {
    loadVisitors();
  }, [machine.id]);

  async function loadVisitors() {
    const [visitorData, count] = await Promise.all([
      fetchMachineVisitors(machine.id, 5),
      fetchMachineVisitorCount(machine.id),
    ]);
    setVisitors(visitorData);
    setVisitorCount(count);
  }

  function handleUpvotePress() {
    if (!canUpvote && !isUpvoted) {
      upvoteButtonRef.current?.shake();
    }
    onUpvotePress(machine.id);
  }

  function goToMachine() {
    router.push({
      pathname: '/machine/[id]',
      params: {
        id: machine.id,
        name: machine.name || '',
        description: machine.description || '',
        address: machine.address || '',
        latitude: String(machine.latitude),
        longitude: String(machine.longitude),
        distance_meters: String(machine.distance_meters || 0),
        primary_photo_url: machine.primary_photo_url || '',
        visit_count: String(machine.visit_count),
        status: machine.status || '',
        categories: JSON.stringify(machine.categories || []),
      },
    });
  }

  function handleShowOnMap() {
    onShowOnMap(machine);
  }

  const formattedDistance = machine.distance_meters
    ? machine.distance_meters < 1000
      ? `${Math.round(machine.distance_meters)}m`
      : `${(machine.distance_meters / 1000).toFixed(1)}km`
    : null;

  return (
    <Pressable style={styles.card} onPress={goToMachine}>
      {/* Photo */}
      <View style={styles.photoContainer}>
        {machine.primary_photo_url ? (
          <Image source={{ uri: machine.primary_photo_url }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="image-outline" size={40} color="#ccc" />
          </View>
        )}
        {formattedDistance && (
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={12} color="#fff" />
            <Text style={styles.distanceText}>{formattedDistance}</Text>
          </View>
        )}
      </View>

      {isVisited && <VisitedStamp />}

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.name} numberOfLines={1}>
          {machine.name || t('machine.unnamed')}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          {machine.address || t('machine.noAddress')}
        </Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="footsteps-outline" size={14} color="#666" />
            <Text style={styles.statText}>{machine.visit_count || 0}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="heart" size={14} color="#FF4B4B" />
            <Text style={styles.statText}>{machine.upvote_count || 0}</Text>
          </View>
        </View>

        {/* Visitors */}
        {visitors.length > 0 && (
          <View style={styles.visitorsRow}>
            <VisitorAvatars
              visitors={visitors}
              totalCount={visitorCount}
              maxDisplay={5}
              size={24}
              onPress={() => onVisitorPress?.(machine.id, visitors, visitorCount)}
            />
            <Text style={styles.visitorsLabel}>
              {t('discover.recentVisitors')}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <UpvoteButton
          ref={upvoteButtonRef}
          upvoteCount={machine.upvote_count || 0}
          isUpvoted={isUpvoted}
          isLoading={isUpvoting}
          disabled={false} // Never disable, handle logic in handleUpvotePress
          onPress={handleUpvotePress}
          size="small"
        />
        <View style={styles.actionButtons}>
          <Pressable
            style={styles.actionButton}
            onPress={() => onSavePress(machine.id)}
            disabled={isSaving}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? t('common.unsave') : t('common.save')}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FF4B4B" />
            ) : (
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={isSaved ? '#FF4B4B' : '#666'}
              />
            )}
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={handleShowOnMap}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('discover.showOnMap')}
          >
            <Ionicons name="map-outline" size={18} color="#3C91E6" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
    overflow: 'hidden',
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 140,
  },
  photoPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  infoSection: {
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#666',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  visitorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  visitorsLabel: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
});
