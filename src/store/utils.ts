import { useAuthStore } from './authStore';
import { useMachinesStore } from './machinesStore';
import { useMachinesCacheStore } from './machinesCacheStore';
import { useSavedMachinesStore } from './savedMachinesStore';
import { useVisitedMachinesStore } from './visitedMachinesStore';
import { useFriendsStore } from './friendsStore';
import { useNotificationsStore } from './notificationsStore';
import { useAdminStore } from './adminStore';

/**
 * Clear all Zustand stores to ensure no sensitive user data remains offline
 * after logout or account deletion.
 */
export const clearAllStores = () => {
  useAuthStore.getState().reset();
  useMachinesStore.getState().reset();
  useMachinesCacheStore.getState().reset();
  useSavedMachinesStore.getState().reset();
  useVisitedMachinesStore.getState().reset();
  useFriendsStore.getState().reset();
  useNotificationsStore.getState().reset();
  useAdminStore.getState().reset();
};
