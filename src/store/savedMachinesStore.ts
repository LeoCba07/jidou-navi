// Saved machines state - for quick lookup of saved machine IDs
// Usage: const isSaved = useSavedMachinesStore((state) => state.savedMachineIds.has(machineId))
import { create } from 'zustand';

interface SavedMachinesState {
  savedMachineIds: Set<string>;
  isLoading: boolean;
  setSavedMachineIds: (ids: string[]) => void;
  addSaved: (machineId: string) => void;
  removeSaved: (machineId: string) => void;
  setLoading: (isLoading: boolean) => void;
  isSaved: (machineId: string) => boolean;
  reset: () => void;
}

export const useSavedMachinesStore = create<SavedMachinesState>((set, get) => ({
  savedMachineIds: new Set(),
  isLoading: false,
  setSavedMachineIds: (ids) => set({ savedMachineIds: new Set(ids) }),
  addSaved: (machineId) =>
    set((state) => {
      const newSet = new Set(state.savedMachineIds);
      newSet.add(machineId);
      return { savedMachineIds: newSet };
    }),
  removeSaved: (machineId) =>
    set((state) => {
      const newSet = new Set(state.savedMachineIds);
      newSet.delete(machineId);
      return { savedMachineIds: newSet };
    }),
  setLoading: (isLoading) => set({ isLoading }),
  isSaved: (machineId) => get().savedMachineIds.has(machineId),
  reset: () => set({ savedMachineIds: new Set(), isLoading: false }),
}));
