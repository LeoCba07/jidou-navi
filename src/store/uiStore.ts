// UI state - filters and modals
// Usage: const filters = useUIStore((state) => state.selectedCategories)
import { create } from 'zustand';
import type { NewlyEarnedBadge } from '../lib/badges';
import type { AppModalConfig } from '../components/AppModal';
import type { ShareCardData } from '../components/ShareableCard';

interface BadgePopupData {
  badges: NewlyEarnedBadge[];
  onDismiss?: () => void;
}

export type ToastType = 'success' | 'info' | 'error';

export interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface UIState {
  selectedCategories: string[];
  isAddMachineModalOpen: boolean;
  badgePopup: BadgePopupData | null;
  appModal: AppModalConfig | null;
  shareCard: ShareCardData | null;
  toast: ToastConfig | null;
  toggleCategory: (category: string) => void;
  clearCategories: () => void;
  setAddMachineModalOpen: (isOpen: boolean) => void;
  showBadgePopup: (badges: NewlyEarnedBadge[], onDismiss?: () => void) => void;
  closeBadgePopup: () => void;
  showModal: (config: AppModalConfig) => void;
  hideModal: () => void;
  showShareCard: (data: ShareCardData) => void;
  closeShareCard: () => void;
  showToast: (config: ToastConfig) => void;
  hideToast: () => void;
  reset: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedCategories: [],
  isAddMachineModalOpen: false,
  badgePopup: null,
  appModal: null,
  shareCard: null,
  toast: null,
  toggleCategory: (category) =>
    set((state) => ({
      selectedCategories: state.selectedCategories.includes(category)
        ? state.selectedCategories.filter((c) => c !== category)
        : [...state.selectedCategories, category],
    })),
  clearCategories: () => set({ selectedCategories: [] }),
  setAddMachineModalOpen: (isOpen) => set({ isAddMachineModalOpen: isOpen }),
  showBadgePopup: (badges, onDismiss) =>
    set({ badgePopup: { badges, onDismiss } }),
  closeBadgePopup: () => set({ badgePopup: null }),
  showModal: (config) => set({ appModal: config }),
  hideModal: () => set({ appModal: null }),
  showShareCard: (data) => set({ shareCard: data }),
  closeShareCard: () => set({ shareCard: null }),
  showToast: (config) => set({ toast: config }),
  hideToast: () => set({ toast: null }),
  reset: () =>
    set({
      selectedCategories: [],
      isAddMachineModalOpen: false,
      badgePopup: null,
      appModal: null,
      shareCard: null,
      toast: null,
    }),
}));
