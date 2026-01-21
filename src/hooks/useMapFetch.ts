// Custom hook for smart map fetching with throttle/debounce hybrid
import { useRef, useCallback } from 'react';
import { MapBounds } from '../lib/machines';
import { useMachinesCacheStore } from '../store/machinesCacheStore';

const THROTTLE_MS = 300;
const DEBOUNCE_MS = 500;

export function useMapFetch() {

  const lastFetchTime = useRef<number>(0);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastBounds = useRef<MapBounds | null>(null);

  const fetchMachinesForBounds = useMachinesCacheStore(
    (state) => state.fetchMachinesForBounds
  );
  const isFetching = useMachinesCacheStore((state) => state.isFetching);

  // Check if new bounds extend significantly beyond last fetched bounds
  const boundsExtendedSignificantly = useCallback(
    (newBounds: MapBounds): boolean => {
      if (!lastBounds.current) return true;

      const oldLatRange = lastBounds.current.maxLat - lastBounds.current.minLat;
      const oldLngRange = lastBounds.current.maxLng - lastBounds.current.minLng;

      // Check how much new bounds extend beyond old bounds
      const latOverflowMin = Math.max(0, lastBounds.current.minLat - newBounds.minLat);
      const latOverflowMax = Math.max(0, newBounds.maxLat - lastBounds.current.maxLat);
      const lngOverflowMin = Math.max(0, lastBounds.current.minLng - newBounds.minLng);
      const lngOverflowMax = Math.max(0, newBounds.maxLng - lastBounds.current.maxLng);

      const latOverflow = latOverflowMin + latOverflowMax;
      const lngOverflow = lngOverflowMin + lngOverflowMax;

      // Refetch if bounds extend >30% beyond cached area
      return (latOverflow / oldLatRange > 0.3) || (lngOverflow / oldLngRange > 0.3);
    },
    []
  );

  // Main fetch handler with throttle + debounce hybrid
  const handleRegionChange = useCallback(
    (bounds: MapBounds) => {
      // Clear any pending debounced fetch
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }

      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTime.current;

      // Throttle gate: if enough time has passed, fetch immediately
      if (timeSinceLastFetch >= THROTTLE_MS && boundsExtendedSignificantly(bounds)) {
        lastFetchTime.current = now;
        lastBounds.current = bounds;
        fetchMachinesForBounds(bounds);
        return;
      }

      // Otherwise, schedule debounced fetch
      debounceTimer.current = setTimeout(() => {
        if (boundsExtendedSignificantly(bounds)) {
          lastFetchTime.current = Date.now();
          lastBounds.current = bounds;
          fetchMachinesForBounds(bounds);
        }
      }, DEBOUNCE_MS);
    },
    [fetchMachinesForBounds, boundsExtendedSignificantly]
  );

  // Force fetch (bypasses throttle/debounce, used for initial load or search results)
  const forceFetch = useCallback(
    (bounds: MapBounds) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      lastFetchTime.current = Date.now();
      lastBounds.current = bounds;
      fetchMachinesForBounds(bounds);
    },
    [fetchMachinesForBounds]
  );

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  return {
    handleRegionChange,
    forceFetch,
    cleanup,
    isFetching,
  };
}
