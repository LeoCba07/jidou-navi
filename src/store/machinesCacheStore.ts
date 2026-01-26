// Tile-based caching store for map machines
// Caches machines by geographic tiles for efficient map fetching
import { create } from 'zustand';
import { NearbyMachine, MapBounds, fetchMachinesInBounds } from '../lib/machines';

// Tile precision: 3 decimal places = ~111m x 111m tiles
const TILE_PRECISION = 3;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const BUFFER_PERCENT = 0.2; // 20% buffer for prefetching

type TileKey = string;

interface CachedTile {
  machines: NearbyMachine[];
  fetchedAt: number;
}

interface MachinesCacheState {
  tileCache: Map<TileKey, CachedTile>;
  visibleMachines: NearbyMachine[];
  lastFetchBounds: MapBounds | null;
  isFetching: boolean;
  fetchError: string | null;

  // Actions
  fetchMachinesForBounds: (bounds: MapBounds) => Promise<void>;
  getMachinesInBounds: (bounds: MapBounds) => NearbyMachine[];
  clearCache: () => void;
  setVisibleMachines: (machines: NearbyMachine[]) => void;
  clearError: () => void;
}

// Convert lat/lng to tile key
function toTileKey(lat: number, lng: number): TileKey {
  const latTile = lat.toFixed(TILE_PRECISION);
  const lngTile = lng.toFixed(TILE_PRECISION);
  return `${latTile}:${lngTile}`;
}

// Get all tile keys that cover a bounding box
function getTileKeysForBounds(bounds: MapBounds): TileKey[] {
  const step = Math.pow(10, -TILE_PRECISION);
  const keys: TileKey[] = [];

  for (let lat = Math.floor(bounds.minLat / step) * step; lat <= bounds.maxLat; lat += step) {
    for (let lng = Math.floor(bounds.minLng / step) * step; lng <= bounds.maxLng; lng += step) {
      keys.push(toTileKey(lat, lng));
    }
  }

  return keys;
}

// Add buffer to bounds for prefetching
function expandBounds(bounds: MapBounds, bufferPercent: number): MapBounds {
  const latRange = bounds.maxLat - bounds.minLat;
  const lngRange = bounds.maxLng - bounds.minLng;
  const latBuffer = latRange * bufferPercent;
  const lngBuffer = lngRange * bufferPercent;

  return {
    minLat: bounds.minLat - latBuffer,
    maxLat: bounds.maxLat + latBuffer,
    minLng: bounds.minLng - lngBuffer,
    maxLng: bounds.maxLng + lngBuffer,
  };
}

// Check if bounds need refetch (extends >30% beyond cached area)
function shouldRefetch(newBounds: MapBounds, lastBounds: MapBounds | null): boolean {
  if (!lastBounds) return true;

  const oldLatRange = lastBounds.maxLat - lastBounds.minLat;
  const oldLngRange = lastBounds.maxLng - lastBounds.minLng;

  // Check how much the new bounds extend beyond the old bounds
  const latOverflowMin = Math.max(0, lastBounds.minLat - newBounds.minLat);
  const latOverflowMax = Math.max(0, newBounds.maxLat - lastBounds.maxLat);
  const lngOverflowMin = Math.max(0, lastBounds.minLng - newBounds.minLng);
  const lngOverflowMax = Math.max(0, newBounds.maxLng - lastBounds.maxLng);

  const latOverflow = latOverflowMin + latOverflowMax;
  const lngOverflow = lngOverflowMin + lngOverflowMax;

  return (latOverflow / oldLatRange > 0.1) || (lngOverflow / oldLngRange > 0.1);
}

export const useMachinesCacheStore = create<MachinesCacheState>((set, get) => ({
  tileCache: new Map(),
  visibleMachines: [],
  lastFetchBounds: null,
  isFetching: false,
  fetchError: null,

  fetchMachinesForBounds: async (bounds: MapBounds) => {
    const state = get();

    // Don't refetch if new bounds are well within cached area
    if (!shouldRefetch(bounds, state.lastFetchBounds)) {
      // Just update visible machines from cache
      const machines = state.getMachinesInBounds(bounds);
      set({ visibleMachines: machines });
      return;
    }

    // Check which tiles are uncached or stale
    const now = Date.now();
    const expandedBounds = expandBounds(bounds, BUFFER_PERCENT);
    const tileKeys = getTileKeysForBounds(expandedBounds);

    const staleTiles = tileKeys.filter((key) => {
      const cached = state.tileCache.get(key);
      return !cached || (now - cached.fetchedAt > CACHE_TTL_MS);
    });

    // If all tiles are fresh, just update visible from cache
    if (staleTiles.length === 0) {
      const machines = state.getMachinesInBounds(bounds);
      set({ visibleMachines: machines });
      return;
    }

    // Fetch machines for the expanded bounds
    set({ isFetching: true, fetchError: null });

    const data = await fetchMachinesInBounds(expandedBounds);

    if (data === null) {
      // Network error - keep using cache and set error
      set({ isFetching: false, fetchError: 'fetch_failed' });
      return;
    }

    // Distribute fetched machines into tiles
    const newCache = new Map(state.tileCache);
    const fetchedAt = Date.now();

    // Clear stale tiles first
    for (const key of staleTiles) {
      newCache.set(key, { machines: [], fetchedAt });
    }

    // Distribute machines to their tiles
    for (const machine of data) {
      const key = toTileKey(machine.latitude, machine.longitude);
      const tile = newCache.get(key);
      if (tile) {
        tile.machines.push(machine);
      } else {
        newCache.set(key, { machines: [machine], fetchedAt });
      }
    }

    // Update state
    set({
      tileCache: newCache,
      lastFetchBounds: expandedBounds,
      isFetching: false,
      fetchError: null,
    });

    // Update visible machines
    const machines = get().getMachinesInBounds(bounds);
    set({ visibleMachines: machines });
  },

  getMachinesInBounds: (bounds: MapBounds): NearbyMachine[] => {
    const state = get();
    const tileKeys = getTileKeysForBounds(bounds);
    const machineMap = new Map<string, NearbyMachine>();

    // Aggregate machines from all visible tiles, deduplicate by ID
    for (const key of tileKeys) {
      const tile = state.tileCache.get(key);
      if (tile) {
        for (const machine of tile.machines) {
          // Only include if actually within bounds (tile edges may include outside machines)
          if (
            machine.latitude >= bounds.minLat &&
            machine.latitude <= bounds.maxLat &&
            machine.longitude >= bounds.minLng &&
            machine.longitude <= bounds.maxLng
          ) {
            machineMap.set(machine.id, machine);
          }
        }
      }
    }

    return Array.from(machineMap.values());
  },

  clearCache: () => {
    set({
      tileCache: new Map(),
      visibleMachines: [],
      lastFetchBounds: null,
    });
  },

  setVisibleMachines: (machines: NearbyMachine[]) => {
    set({ visibleMachines: machines });
  },

  clearError: () => {
    set({ fetchError: null });
  },
}));
