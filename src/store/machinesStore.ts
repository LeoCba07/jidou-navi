// Machines state - nearby machines and selected machine
// Usage: const machines = useMachinesStore((state) => state.machines)
import { create } from 'zustand';
import { Tables } from '../lib/database.types';

type Machine = Tables<'machines'>;

interface MachinesState {
  machines: Machine[];
  selectedMachine: Machine | null;
  isLoading: boolean;
  setMachines: (machines: Machine[]) => void;
  setSelectedMachine: (machine: Machine | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useMachinesStore = create<MachinesState>((set) => ({
  machines: [],
  selectedMachine: null,
  isLoading: false,
  setMachines: (machines) => set({ machines }),
  setSelectedMachine: (selectedMachine) => set({ selectedMachine }),
  setLoading: (isLoading) => set({ isLoading }),
}));
