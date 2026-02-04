// Visited machines state - for quick lookup of visited machine IDs
// Usage: const isVisited = useVisitedMachinesStore((state) => state.isVisited(machineId))
import { create } from 'zustand';

interface VisitedMachinesState {
  visitedMachineIds: Set<string>;
  isLoading: boolean;
  setVisitedMachineIds: (ids: string[]) => void;
  addVisited: (machineId: string) => void;
  setLoading: (isLoading: boolean) => void;
  isVisited: (machineId: string) => boolean;
}

export const useVisitedMachinesStore = create<VisitedMachinesState>((set, get) => ({
  visitedMachineIds: new Set(),
  isLoading: false,
  setVisitedMachineIds: (ids) => set({ visitedMachineIds: new Set(ids) }),
  addVisited: (machineId) =>
    set((state) => {
      const newSet = new Set(state.visitedMachineIds);
      newSet.add(machineId);
      return { visitedMachineIds: newSet };
    }),
  setLoading: (isLoading) => set({ isLoading }),
  isVisited: (machineId) => get().visitedMachineIds.has(machineId),
}));
