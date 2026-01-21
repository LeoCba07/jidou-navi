// Custom hook for smart map fetching with debounce
import { useRef, useCallback } from 'react';
import { MapBounds } from '../lib/machines';
import { useMachinesCacheStore } from '../store/machinesCacheStore';

const DEBOUNCE_MS = 300;

export function useMapFetch() {
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchMachinesForBounds = useMachinesCacheStore(
    (state) => state.fetchMachinesForBounds
  );
  const isFetching = useMachinesCacheStore((state) => state.isFetching);

  // Main fetch handler with simple debounce - let cache store handle optimization
  const handleRegionChange = useCallback(
    (bounds: MapBounds) => {
      // Clear any pending debounced fetch
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }

      // Debounce the fetch
      debounceTimer.current = setTimeout(() => {
        fetchMachinesForBounds(bounds);
      }, DEBOUNCE_MS);
    },
    [fetchMachinesForBounds]
  );

  // Force fetch (bypasses debounce, used for initial load or search results)
  const forceFetch = useCallback(
    (bounds: MapBounds) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
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
