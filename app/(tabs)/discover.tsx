// Discover screen - trending and popular vending machines with engagement
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useScrollToTop } from '@react-navigation/native';
import * as Location from 'expo-location';
import { FONT_SIZES, ICON_SIZES } from '../../src/theme/constants';
import {
  fetchPopularThisWeek,
  fetchNearbyMachinesWithEngagement,
  EngagedMachine,
  MachineVisitor,
  saveMachine,
  unsaveMachine,
} from '../../src/lib/machines';
import {
  getRemainingUpvotes,
  getUserUpvotedMachineIds,
  upvoteMachine,
  removeUpvote,
  MAX_DAILY_UPVOTES,
  XP_PER_UPVOTE,
} from '../../src/lib/upvotes';
import { updateLocalXP } from '../../src/lib/xp';
import { useAuthStore } from '../../src/store/authStore';
import { useSavedMachinesStore } from '../../src/store/savedMachinesStore';
import { useAppModal } from '../../src/hooks/useAppModal';
import { useToast } from '../../src/hooks/useToast';
import { LeaderboardScreen } from '../../src/components/leaderboard';
import { DiscoverMachineCard } from '../../src/components/discover';
import PixelLoader from '../../src/components/PixelLoader';
import RecentVisitorsModal from '../../src/components/discover/RecentVisitorsModal';
import DailyVotesIndicator, { type DailyVotesIndicatorRef } from '../../src/components/discover/DailyVotesIndicator';
const EMPTY_TRENDING = require('../../assets/pixel-empty-trending.png');
const EMPTY_NEARBY = require('../../assets/pixel-empty-nearby.png');
const EMPTY_LOCATION = require('../../assets/pixel-empty-location.png');

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { savedMachineIds, addSaved, removeSaved } = useSavedMachinesStore();
  const { show, showError, hide } = useAppModal();
  const toast = useToast();
  const headerIndicatorRef = React.useRef<DailyVotesIndicatorRef>(null);
  const contentIndicatorRef = React.useRef<DailyVotesIndicatorRef>(null);
  const scrollRef = React.useRef<ScrollView>(null);

  useScrollToTop(scrollRef);

  // Data state
  const [popularMachines, setPopularMachines] = React.useState<EngagedMachine[]>([]);
  const [nearbyMachines, setNearbyMachines] = React.useState<EngagedMachine[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set());

  // Location state
  const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = React.useState(false);

  // Upvote state
  const [upvotedIds, setUpvotedIds] = React.useState<Set<string>>(new Set());
  const [upvotingIds, setUpvotingIds] = React.useState<Set<string>>(new Set());
  const [remainingVotes, setRemainingVotes] = React.useState(MAX_DAILY_UPVOTES);

  // Get user location
  async function getUserLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(true);
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setUserLocation(coords);
      setLocationError(false);
      return coords;
    } catch {
      setLocationError(true);
      return null;
    }
  }

  // Load all data
  async function loadData(coords?: { lat: number; lng: number } | null) {
    // Try new upvote-based functions first
    const [popular, upvoted, remaining] = await Promise.all([
      fetchPopularThisWeek(10),
      user ? getUserUpvotedMachineIds() : Promise.resolve([]),
      user ? getRemainingUpvotes() : Promise.resolve(MAX_DAILY_UPVOTES),
    ]);

    setPopularMachines(popular);
    setUpvotedIds(new Set(upvoted));
    setRemainingVotes(remaining);

    // Load nearby if we have location
    const location = coords || userLocation;
    if (location) {
      const nearby = await fetchNearbyMachinesWithEngagement(
        location.lat,
        location.lng,
        5000,
        10
      );
      setNearbyMachines(nearby);
    }

    setLoading(false);
  }

  React.useEffect(() => {
    async function init() {
      const coords = await getUserLocation();
      await loadData(coords);
    }
    init();
  }, [user]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    const coords = await getUserLocation();
    await loadData(coords);
    setRefreshing(false);
  }, [user]);

  // Navigate to machine on map
  function handleShowOnMap(machine: EngagedMachine) {
    router.push({
      pathname: '/(tabs)',
      params: {
        focusLat: String(machine.latitude),
        focusLng: String(machine.longitude),
        focusMachineId: machine.id,
      },
    });
  }

  async function handleVisitorPress(machineId: string, initialVisitors: MachineVisitor[], totalCount: number) {
    // If we only have the preview (5), fetch all of them (or a larger page)
    // For now, if totalCount > initialVisitors.length, we fetch up to 20
    let allVisitors = initialVisitors;
    if (totalCount > initialVisitors.length) {
      const { fetchMachineVisitors } = await import('../../src/lib/machines');
      allVisitors = await fetchMachineVisitors(machineId, 50);
    }

    show({
      type: 'info',
      title: '',
      message: '',
      children: (
        <RecentVisitorsModal 
          visitors={allVisitors} 
          onClose={hide} 
        />
      )
    });
  }

  // Handle upvote/remove upvote
  async function handleUpvotePress(machineId: string) {
    if (!user) {
      showError(t('machine.loginRequired'), t('discover.loginToUpvote'));
      return;
    }

    // Prevent double-tap
    if (upvotingIds.has(machineId)) return;

    const wasUpvoted = upvotedIds.has(machineId);

    // Optimistic update
    setUpvotingIds((prev) => new Set(prev).add(machineId));

    if (wasUpvoted) {
      // Remove upvote
      setUpvotedIds((prev) => {
        const next = new Set(prev);
        next.delete(machineId);
        return next;
      });

      // Update machine's upvote count optimistically
      updateMachineUpvoteCount(machineId, -1);
      
      // Update XP optimistically
      updateLocalXP(-XP_PER_UPVOTE);

      const result = await removeUpvote(machineId);

      if (result.success) {
        setRemainingVotes(result.remaining_votes ?? remainingVotes + 1);
        // Don't show modal for removing upvote (UI update is enough)
      } else {
        // Revert on failure
        setUpvotedIds((prev) => new Set(prev).add(machineId));
        updateMachineUpvoteCount(machineId, 1);
        updateLocalXP(XP_PER_UPVOTE);
        showError(t('common.error'), t('common.error'));
      }
    } else {
      // Add upvote - check remaining votes first
      if (remainingVotes <= 0) {
        setUpvotingIds((prev) => {
          const next = new Set(prev);
          next.delete(machineId);
          return next;
        });
        // Feedback via shake animation on both indicators
        headerIndicatorRef.current?.shake();
        contentIndicatorRef.current?.shake();
        return;
      }

      setUpvotedIds((prev) => new Set(prev).add(machineId));
      updateMachineUpvoteCount(machineId, 1);
      
      // Update XP optimistically
      const localXPResult = updateLocalXP(XP_PER_UPVOTE);

      const result = await upvoteMachine(machineId);

      if (result.success) {
        setRemainingVotes(result.remaining_votes ?? remainingVotes - 1);
        if (localXPResult?.leveledUp) {
          toast.showSuccess(t('profile.levelUp', { level: localXPResult.newLevel }));
        }
      } else {
        // Revert on failure
        setUpvotedIds((prev) => {
          const next = new Set(prev);
          next.delete(machineId);
          return next;
        });
        updateMachineUpvoteCount(machineId, -1);
        updateLocalXP(-XP_PER_UPVOTE);

        if (result.error === 'daily_limit_reached') {
          // Feedback via shake animation on both indicators
          headerIndicatorRef.current?.shake();
          contentIndicatorRef.current?.shake();
        } else {
          showError(t('common.error'), t('common.error'));
        }
      }
    }

    setUpvotingIds((prev) => {
      const next = new Set(prev);
      next.delete(machineId);
      return next;
    });
  }

  // Helper to update machine upvote count in state
  function updateMachineUpvoteCount(machineId: string, delta: number) {
    setPopularMachines((prev) =>
      prev.map((m) =>
        m.id === machineId ? { ...m, upvote_count: (m.upvote_count || 0) + delta } : m
      )
    );
    setNearbyMachines((prev) =>
      prev.map((m) =>
        m.id === machineId ? { ...m, upvote_count: (m.upvote_count || 0) + delta } : m
      )
    );
  }

  async function handleSaveToggle(machineId: string) {
    if (!user) {
      showError(t('machine.loginRequired'), t('machine.loginToSave'));
      return;
    }

    if (savingIds.has(machineId)) return;

    setSavingIds((prev) => new Set(prev).add(machineId));
    const wasSaved = savedMachineIds.has(machineId);

    try {
      if (wasSaved) {
        removeSaved(machineId);
        const success = await unsaveMachine(machineId);
        if (!success) {
          addSaved(machineId);
          showError(t('common.error'), t('machine.unsaveError'));
        } else {
          toast.showInfo(t('machine.unsaveSuccess'));
        }
      } else {
        addSaved(machineId);
        const success = await saveMachine(machineId);
        if (!success) {
          removeSaved(machineId);
          showError(t('common.error'), t('machine.saveError'));
        } else {
          toast.showSuccess(t('machine.saveSuccess'));
        }
      }
    } catch {
      if (wasSaved) {
        addSaved(machineId);
      } else {
        removeSaved(machineId);
      }
      showError(t('common.error'), t('common.error'));
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(machineId);
        return next;
      });
    }
  }

  if (loading) {
    return <PixelLoader fullScreen />;
  }

  const canUpvote = remainingVotes > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('discover.title')}</Text>
        {user && (
          <DailyVotesIndicator ref={headerIndicatorRef} remainingVotes={remainingVotes} compact />
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4B4B" />
        }
      >
        {user && (
          <View style={styles.section}>
            <LeaderboardScreen />
          </View>
        )}

        {user && (
          <View style={styles.votesSection}>
            <DailyVotesIndicator ref={contentIndicatorRef} remainingVotes={remainingVotes} />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={ICON_SIZES.sm} color="#FF4B4B" />
            <Text style={styles.sectionTitle}>{t('discover.popularThisWeek')}</Text>
          </View>
          {popularMachines.length === 0 ? (
            <View style={styles.emptyState}>
              <Image source={EMPTY_TRENDING} style={styles.emptyImage} />
              <Text style={styles.emptyText}>{t('discover.noPopularThisWeek')}</Text>
            </View>
          ) : (
            <View style={styles.machineList}>
              {popularMachines.map((machine) => (
                <DiscoverMachineCard
                  key={machine.id}
                  machine={machine}
                  isUpvoted={upvotedIds.has(machine.id)}
                  isUpvoting={upvotingIds.has(machine.id)}
                  canUpvote={canUpvote}
                  isSaved={savedMachineIds.has(machine.id)}
                  isSaving={savingIds.has(machine.id)}
                  onUpvotePress={handleUpvotePress}
                  onSavePress={handleSaveToggle}
                  onShowOnMap={handleShowOnMap}
                  onVisitorPress={handleVisitorPress}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={ICON_SIZES.sm} color="#3C91E6" />
            <Text style={styles.sectionTitle}>{t('discover.topNearby')}</Text>
          </View>
          {locationError ? (
            <View style={styles.emptyState}>
              <Image source={EMPTY_LOCATION} style={styles.emptyImage} />
              <Text style={styles.emptyText}>{t('discover.enableLocation')}</Text>
            </View>
          ) : nearbyMachines.length === 0 ? (
            <View style={styles.emptyState}>
              <Image source={EMPTY_NEARBY} style={styles.emptyImage} />
              <Text style={styles.emptyText}>{t('discover.noNearbyMachines')}</Text>
            </View>
          ) : (
            <View style={styles.machineList}>
              {nearbyMachines.map((machine) => (
                <DiscoverMachineCard
                  key={machine.id}
                  machine={machine}
                  isUpvoted={upvotedIds.has(machine.id)}
                  isUpvoting={upvotingIds.has(machine.id)}
                  canUpvote={canUpvote}
                  isSaved={savedMachineIds.has(machine.id)}
                  isSaving={savingIds.has(machine.id)}
                  onUpvotePress={handleUpvotePress}
                  onSavePress={handleSaveToggle}
                  onShowOnMap={handleShowOnMap}
                  onVisitorPress={handleVisitorPress}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF3E7',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF3E7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  votesSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter-Bold',
    color: '#2B2B2B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyImage: {
    width: 120,
    height: 120,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter',
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  machineList: {
    gap: 16,
  },
});
