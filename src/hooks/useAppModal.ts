// Hook for showing app modals
import { useCallback } from 'react';
import { useUIStore } from '../store/uiStore';
import type { AppModalConfig, ModalButton } from '../components/AppModal';

export function useAppModal() {
  const showModal = useUIStore((state) => state.showModal);
  const hideModal = useUIStore((state) => state.hideModal);

  const show = useCallback((config: AppModalConfig) => {
    showModal(config);
  }, [showModal]);

  const showError = useCallback((
    title: string,
    message: string,
    onDismiss?: () => void
  ) => {
    showModal({
      type: 'error',
      title,
      message,
      buttons: [{ text: 'OK', style: 'primary' }],
      onDismiss,
    });
  }, [showModal]);

  const showSuccess = useCallback((
    title: string,
    message: string,
    onDismiss?: () => void,
    buttonText: string = 'OK',
    xpAmount?: number
  ) => {
    showModal({
      type: 'success',
      title,
      message,
      buttons: [{ text: buttonText, style: 'primary', onPress: onDismiss }],
      xpAmount,
    });
  }, [showModal]);

  const showConfirm = useCallback((
    title: string,
    message: string,
    buttons: ModalButton[],
    onDismiss?: () => void
  ) => {
    showModal({
      type: 'confirm',
      title,
      message,
      buttons,
      onDismiss,
    });
  }, [showModal]);

  const showInfo = useCallback((
    title: string,
    message: string,
    onDismiss?: () => void,
    xpAmount?: number
  ) => {
    showModal({
      type: 'info',
      title,
      message,
      buttons: [{ text: 'OK', style: 'primary' }],
      onDismiss,
      xpAmount,
    });
  }, [showModal]);

  return {
    show,
    hide: hideModal,
    showError,
    showSuccess,
    showConfirm,
    showInfo,
  };
}
