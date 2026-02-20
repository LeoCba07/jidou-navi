import { useCallback } from 'react';
import { useUIStore, ToastType, ToastConfig } from '../store/uiStore';

export const useToast = () => {
  const showToast = useUIStore((state) => state.showToast);
  const hideToast = useUIStore((state) => state.hideToast);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'success', duration });
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'info', duration });
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    showToast({ message, type: 'error', duration });
  }, [showToast]);

  return {
    showSuccess,
    showInfo,
    showError,
    hideToast,
  };
};
