// UI state - filters and modals
// Usage: const filters = useUIStore((state) => state.selectedCategories)
import { create } from 'zustand';

interface UIState {
  selectedCategories: string[];
  isAddMachineModalOpen: boolean;
  toggleCategory: (category: string) => void;
  clearCategories: () => void;
  setAddMachineModalOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedCategories: [],
  isAddMachineModalOpen: false,
  toggleCategory: (category) =>
    set((state) => ({
      selectedCategories: state.selectedCategories.includes(category)
        ? state.selectedCategories.filter((c) => c !== category)
        : [...state.selectedCategories, category],
    })),
  clearCategories: () => set({ selectedCategories: [] }),
  setAddMachineModalOpen: (isOpen) => set({ isAddMachineModalOpen: isOpen }),
}));
