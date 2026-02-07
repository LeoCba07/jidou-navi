// Discover screen - trending and popular vending machines with engagement
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import {
  fetchPopularThisWeek,
  fetchNearbyMachinesWithEngagement,
  fetchPopularMachines,
  fetchRecentMachines,
  EngagedMachine,
  DiscoverMachine,
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
import { LeaderboardScreen } from '../../src/components/leaderboard';
import { DiscoverMachineCard } from '../../src/components/discover';
import DailyVotesIndicator, { type DailyVotesIndicatorRef } from '../../src/components/discover/DailyVotesIndicator';

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { savedMachineIds, addSaved, removeSaved } = useSavedMachinesStore();
  const { showError, showSuccess } = useAppModal();
  const headerIndicatorRef = React.useRef<DailyVotesIndicatorRef>(null);
  const contentIndicatorRef = React.useRef<DailyVotesIndicatorRef>(null);

  // Data state
  const [popularMachines, setPopularMachines] = React.useState<EngagedMachine[]>([]);
  const [nearbyMachines, setNearbyMachines] = React.useState<EngagedMachine[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  // Fallback state (when upvote system not available)
  const [useFallback, setUseFallback] = React.useState(false);
  const [fallbackPopular, setFallbackPopular] = React.useState<DiscoverMachine[]>([]);
  const [fallbackRecent, setFallbackRecent] = React.useState<DiscoverMachine[]>([]);
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

    // Check if we got data from the new functions
    // If popular is empty AND we got no upvoted IDs, it might mean the migration isn't run
    // We'll use fallback in that case
    const shouldUseFallback = popular.length === 0;

    if (shouldUseFallback) {
      // Load fallback data using original functions
      const [fallbackPop, fallbackRec] = await Promise.all([
        fetchPopularMachines(10),
        fetchRecentMachines(10),
      ]);
      setFallbackPopular(fallbackPop);
      setFallbackRecent(fallbackRec);
      setUseFallback(true);
    } else {
      setPopularMachines(popular);
      setUpvotedIds(new Set(upvoted));
      setRemainingVotes(remaining);
      setUseFallback(false);

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
      updateLocalXP(XP_PER_UPVOTE);

      const result = await upvoteMachine(machineId);

      if (result.success) {
        setRemainingVotes(result.remaining_votes ?? remainingVotes - 1);
        // Only show modal if XP was awarded
        if (result.xp_awarded && result.xp_awarded > 0) {
          showSuccess(
            t('common.success'),
            t('discover.upvoteSuccess', { xp: result.xp_awarded }),
            undefined,
            'OK',
            result.xp_awarded
          );
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

  // Fallback: navigate to machine detail
  function goToMachine(machine: DiscoverMachine) {
    router.push({
      pathname: '/machine/[id]',
      params: {
        id: machine.id,
        name: machine.name || '',
        description: machine.description || '',
        address: machine.address || '',
        latitude: String(machine.latitude),
        longitude: String(machine.longitude),
        distance_meters: '0',
        primary_photo_url: machine.primary_photo_url || '',
        visit_count: String(machine.visit_count),
        status: machine.status || '',
        categories: JSON.stringify(machine.categories || []),
      },
    });
  }

  // Fallback: save toggle
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
        }
      } else {
        addSaved(machineId);
        const success = await saveMachine(machineId);
        if (!success) {
          removeSaved(machineId);
          showError(t('common.error'), t('machine.saveError'));
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

  // Fallback: render machine card (original design)
  function renderFallbackMachineCard(machine: DiscoverMachine) {
    const isSaved = savedMachineIds.has(machine.id);
    const isSaving = savingIds.has(machine.id);
    return (
      <Pressable
        key={machine.id}
        style={styles.machineCard}
        onPress={() => goToMachine(machine)}
      >
        {machine.primary_photo_url ? (
          <Image
            source={{ uri: machine.primary_photo_url }}
            style={styles.machinePhoto}
          />
        ) : (
          <View style={[styles.machinePhoto, styles.machinePhotoPlaceholder]}>
            <Ionicons name="image-outline" size={32} color="#ccc" />
          </View>
        )}
        <View style={styles.machineInfo}>
          <Text style={styles.machineName} numberOfLines={1}>
            {machine.name || t('machine.unnamed')}
          </Text>
          <Text style={styles.machineAddress} numberOfLines={1}>
            {machine.address || t('machine.noAddress')}
          </Text>
          <View style={styles.machineStats}>
            <Ionicons name="footsteps-outline" size={14} color="#666" />
            <Text style={styles.statsText}>
              {machine.visit_count || 0} {t('discover.visits')}
            </Text>
          </View>
        </View>
        <Pressable
          style={styles.bookmarkButton}
          onPress={() => handleSaveToggle(machine.id)}
          disabled={isSaving}
          hitSlop={8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FF4B4B" />
          ) : (
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isSaved ? '#FF4B4B' : '#999'}
            />
          )}
        </Pressable>
      </Pressable>
    );
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#FF4B4B" />
      </View>
    );
  }

  const canUpvote = remainingVotes > 0;

  // Render fallback UI (original design without upvotes)
  if (useFallback) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('discover.title')}</Text>
        </View>

        <ScrollView
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

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flame" size={20} color="#FF4B4B" />
              <Text style={styles.sectionTitle}>{t('discover.popular')}</Text>
            </View>
            {fallbackPopular.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>{t('discover.noPopular')}</Text>
              </View>
            ) : (
              <View style={styles.fallbackMachineList}>
                {fallbackPopular.map(renderFallbackMachineCard)}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={20} color="#3C91E6" />
              <Text style={styles.sectionTitle}>{t('discover.recentlyAdded')}</Text>
            </View>
            {fallbackRecent.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>{t('discover.noRecent')}</Text>
              </View>
            ) : (
              <View style={styles.fallbackMachineList}>
                {fallbackRecent.map(renderFallbackMachineCard)}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Render new UI with upvotes
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('discover.title')}</Text>
        {user && (
          <DailyVotesIndicator ref={headerIndicatorRef} remainingVotes={remainingVotes} compact />
        )}
      </View>

      <ScrollView
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
            <Ionicons name="trending-up" size={20} color="#FF4B4B" />
            <Text style={styles.sectionTitle}>{t('discover.popularThisWeek')}</Text>
          </View>
          {popularMachines.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flame-outline" size={48} color="#ccc" />
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
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color="#3C91E6" />
            <Text style={styles.sectionTitle}>{t('discover.topNearby')}</Text>
          </View>
          {locationError ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>{t('discover.enableLocation')}</Text>
            </View>
          ) : nearbyMachines.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#ccc" />
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
    fontSize: 20,
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
    fontSize: 13,
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
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  machineList: {
    gap: 16,
  },
  // Fallback styles (original design)
  fallbackMachineList: {
    gap: 12,
  },
  machineCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 2,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
  },
  machinePhoto: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  machinePhotoPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  machineInfo: {
    flex: 1,
    marginLeft: 12,
  },
  machineName: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    marginBottom: 4,
  },
  machineAddress: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#666',
    marginBottom: 6,
  },
  machineStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#666',
  },
  bookmarkButton: {
    padding: 8,
    marginLeft: 4,
  },
});
