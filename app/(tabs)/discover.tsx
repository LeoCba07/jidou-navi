// Discover screen - trending and popular vending machines
import { useEffect, useState, useCallback } from 'react';
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
import {
  fetchPopularMachines,
  fetchRecentMachines,
  saveMachine,
  unsaveMachine,
  DiscoverMachine,
} from '../../src/lib/machines';
import { useAuthStore } from '../../src/store/authStore';
import { useSavedMachinesStore } from '../../src/store/savedMachinesStore';
import { useAppModal } from '../../src/hooks/useAppModal';
import { LeaderboardScreen } from '../../src/components/leaderboard';

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { savedMachineIds, addSaved, removeSaved } = useSavedMachinesStore();
  const { showError } = useAppModal();
  const [popularMachines, setPopularMachines] = useState<DiscoverMachine[]>([]);
  const [recentMachines, setRecentMachines] = useState<DiscoverMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  async function loadData() {
    const [popular, recent] = await Promise.all([
      fetchPopularMachines(10),
      fetchRecentMachines(10),
    ]);
    setPopularMachines(popular);
    setRecentMachines(recent);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

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

  async function handleSaveToggle(machineId: string) {
    if (!user) {
      showError(t('machine.loginRequired'), t('machine.loginToSave'));
      return;
    }

    // Prevent double-tap
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

  function renderMachineCard(machine: DiscoverMachine) {
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

  return (
    <View style={styles.container}>
      {/* Header */}
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
        {/* Leaderboard Section */}
        {user && (
          <View style={styles.section}>
            <LeaderboardScreen />
          </View>
        )}

        {/* Popular Machines Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flame" size={20} color="#FF4B4B" />
            <Text style={styles.sectionTitle}>{t('discover.popular')}</Text>
          </View>
          {popularMachines.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>{t('discover.noPopular')}</Text>
            </View>
          ) : (
            <View style={styles.machineList}>
              {popularMachines.map(renderMachineCard)}
            </View>
          )}
        </View>

        {/* Recently Added Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={20} color="#3C91E6" />
            <Text style={styles.sectionTitle}>{t('discover.recentlyAdded')}</Text>
          </View>
          {recentMachines.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>{t('discover.noRecent')}</Text>
            </View>
          ) : (
            <View style={styles.machineList}>
              {recentMachines.map(renderMachineCard)}
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
