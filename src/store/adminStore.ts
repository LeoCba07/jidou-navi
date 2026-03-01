// Admin state - pending machines queue and review workflow
import { create } from 'zustand';
import {
  PendingMachine,
  NearbyMachine,
  BanUserResult,
  fetchPendingMachines,
  checkDuplicateMachines,
  approveMachine,
  rejectMachine,
  banUser,
  unbanUser,
  removeActivePhoto,
} from '../lib/admin';

interface AdminState {
  pendingMachines: PendingMachine[];
  isLoading: boolean;
  error: string | null;
  selectedMachine: PendingMachine | null;
  nearbyMachines: NearbyMachine[];
  isLoadingNearby: boolean;

  // Actions
  loadPendingMachines: () => Promise<void>;
  selectMachine: (machine: PendingMachine | null) => void;
  loadNearbyMachines: (machineId: string) => Promise<void>;
  approve: (machineId: string, reviewerId: string) => Promise<boolean>;
  reject: (machineId: string, reviewerId: string, reason: string) => Promise<boolean>;
  banUser: (userId: string) => Promise<BanUserResult | null>;
  unbanUser: (userId: string) => Promise<boolean>;
  removeActivePhoto: (photoId: string) => Promise<boolean>;
  reset: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  pendingMachines: [],
  isLoading: false,
  error: null,
  selectedMachine: null,
  nearbyMachines: [],
  isLoadingNearby: false,

  loadPendingMachines: async () => {
    set({ isLoading: true, error: null });
    try {
      const machines = await fetchPendingMachines();
      set({ pendingMachines: machines, isLoading: false });
    } catch (err) {
      set({ error: 'Failed to load pending machines', isLoading: false });
    }
  },

  selectMachine: (machine) => {
    set({ selectedMachine: machine, nearbyMachines: [] });
  },

  loadNearbyMachines: async (machineId: string) => {
    set({ isLoadingNearby: true });
    try {
      const nearby = await checkDuplicateMachines(machineId);
      set({ nearbyMachines: nearby, isLoadingNearby: false });
    } catch (err) {
      set({ nearbyMachines: [], isLoadingNearby: false });
    }
  },

  approve: async (machineId: string, reviewerId: string) => {
    const success = await approveMachine(machineId, reviewerId);
    if (success) {
      // Remove from pending list
      const { pendingMachines } = get();
      set({
        pendingMachines: pendingMachines.filter((m) => m.id !== machineId),
        selectedMachine: null,
      });
    }
    return success;
  },

  reject: async (machineId: string, reviewerId: string, reason: string) => {
    const success = await rejectMachine(machineId, reviewerId, reason);
    if (success) {
      // Remove from pending list
      const { pendingMachines } = get();
      set({
        pendingMachines: pendingMachines.filter((m) => m.id !== machineId),
        selectedMachine: null,
      });
    }
    return success;
  },

  banUser: async (userId: string) => {
    return banUser(userId);
  },

  unbanUser: async (userId: string) => {
    return unbanUser(userId);
  },

  removeActivePhoto: async (photoId: string) => {
    return removeActivePhoto(photoId);
  },

  reset: () => {
    set({
      pendingMachines: [],
      isLoading: false,
      error: null,
      selectedMachine: null,
      nearbyMachines: [],
      isLoadingNearby: false,
    });
  },
}));
