import { useState, useMemo, useCallback } from 'react';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fetchSavedMachines, unsaveMachine, SavedMachine, calculateDistance } from '../lib/machines';
import { XP_VALUES } from '../lib/xp';
import { useSavedMachinesStore } from '../store/savedMachinesStore';
import { useVisitedMachinesStore } from '../store/visitedMachinesStore';
import { useAppModal } from './useAppModal';

export type SortMode = 'distance' | 'xp';

export function useSavedMachinesData() {
  const { t } = useTranslation();
  const { removeSaved } = useSavedMachinesStore();
  const { visitedMachineIds } = useVisitedMachinesStore();
  const { showError } = useAppModal();

  const [savedMachines, setSavedMachines] = useState<SavedMachine[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('distance');

  async function getUserLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUserLocation(null);
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
    } catch (error) {
      console.warn('Failed to get user location:', error);
      setUserLocation(null);
    }
  }

  const loadSavedMachines = useCallback(async () => {
    const machines = await fetchSavedMachines();
    setSavedMachines(machines);
    setLoadingSaved(false);
  }, []);

  const refreshSavedMachines = useCallback(async () => {
    await Promise.all([loadSavedMachines(), getUserLocation()]);
  }, [loadSavedMachines]);

  async function handleUnsave(machineId: string) {
    try {
      await unsaveMachine(machineId);
      removeSaved(machineId);
      setSavedMachines(prev => prev.filter(m => m.machine_id !== machineId));
    } catch (err) {
      showError(t('common.error'), t('machine.unsaveError'));
    }
  }

  function goToMachine(saved: SavedMachine) {
    router.push({
      pathname: '/machine/[id]',
      params: {
        id: saved.machine.id,
        name: saved.machine.name || '',
        description: saved.machine.description || '',
        address: saved.machine.address || '',
        latitude: String(saved.machine.latitude),
        longitude: String(saved.machine.longitude),
        distance_meters: '0',
        primary_photo_url: saved.machine.primary_photo_url || '',
        visit_count: String(saved.machine.visit_count),
        status: saved.machine.status || '',
        last_verified_at: saved.machine.last_verified_at || '',
      },
    });
  }

  function handleShowOnMap(machine: SavedMachine['machine']) {
    router.push({
      pathname: '/(tabs)',
      params: {
        focusLat: String(machine.latitude),
        focusLng: String(machine.longitude),
        focusMachineId: machine.id,
      },
    });
  }

  function getEstimatedXP(machineId: string): number {
    if (visitedMachineIds.has(machineId)) {
      return XP_VALUES.PHOTO_UPLOAD;
    }
    return XP_VALUES.PHOTO_UPLOAD + XP_VALUES.VERIFY_MACHINE;
  }

  const sortedSavedMachines = useMemo(() => {
    const mapped = savedMachines.map((saved) => {
      const distance = userLocation
        ? calculateDistance(
            userLocation.lat,
            userLocation.lng,
            saved.machine.latitude,
            saved.machine.longitude
          )
        : null;
      const xp = getEstimatedXP(saved.machine_id);
      return { saved, distance, xp };
    });

    mapped.sort((a, b) => {
      if (sortMode === 'distance') {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      }
      if (b.xp !== a.xp) return b.xp - a.xp;
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    return mapped;
  }, [savedMachines, userLocation, sortMode, visitedMachineIds]);

  return {
    sortedSavedMachines,
    savedMachines,
    loadingSaved,
    sortMode,
    setSortMode,
    handleUnsave,
    goToMachine,
    handleShowOnMap,
    refreshSavedMachines,
    loadSavedMachines,
    getUserLocation,
    visitedMachineIds,
  };
}
