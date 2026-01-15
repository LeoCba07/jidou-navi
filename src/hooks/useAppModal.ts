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
    buttonText: string = 'OK'
  ) => {
    showModal({
      type: 'success',
      title,
      message,
      buttons: [{ text: buttonText, style: 'primary', onPress: onDismiss }],
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
    onDismiss?: () => void
  ) => {
    showModal({
      type: 'info',
      title,
      message,
      buttons: [{ text: 'OK', style: 'primary' }],
      onDismiss,
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
