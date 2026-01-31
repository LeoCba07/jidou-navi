// Reusable app modal for alerts, confirmations, and info
import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useUIStore } from '../store/uiStore';

const { width } = Dimensions.get('window');

export type ModalType = 'error' | 'success' | 'confirm' | 'info';
export type ButtonStyle = 'default' | 'primary' | 'destructive' | 'cancel';

export interface ModalButton {
  text: string;
  style?: ButtonStyle;
  onPress?: () => void | Promise<void>;
}

export interface AppModalConfig {
  type: ModalType;
  title: string;
  message: string;
  buttons?: ModalButton[];
  onDismiss?: () => void;
  xpAmount?: number;
}

const MODAL_COLORS: Record<ModalType, string> = {
  error: '#FF4B4B',
  success: '#22C55E',
  confirm: '#F59E0B',
  info: '#3C91E6',
};

export default function AppModal() {
  const appModal = useUIStore((state) => state.appModal);
  const hideModal = useUIStore((state) => state.hideModal);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (appModal) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      xpAnim.setValue(0);

      // Play entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        ...(appModal.xpAmount ? [
          Animated.sequence([
            Animated.delay(300),
            Animated.spring(xpAnim, {
              toValue: 1,
              tension: 100,
              friction: 5,
              useNativeDriver: true,
            })
          ])
        ] : [])
      ]).start();
    }
  }, [appModal]);

  function handleClose(callback?: () => void | Promise<void>) {
    // Play exit animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      hideModal();
      appModal?.onDismiss?.();
      if (callback) {
        await callback();
      }
    });
  }

  function handleButtonPress(button: ModalButton) {
    handleClose(button.onPress);
  }

  function getButtonStyle(style?: ButtonStyle) {
    switch (style) {
      case 'destructive':
        return styles.destructiveButton;
      case 'cancel':
        return styles.cancelButton;
      case 'primary':
      default:
        return styles.primaryButton;
    }
  }

  function getButtonTextStyle(style?: ButtonStyle) {
    switch (style) {
      case 'cancel':
        return styles.cancelButtonText;
      case 'destructive':
      case 'primary':
      default:
        return styles.primaryButtonText;
    }
  }

  if (!appModal) return null;

  const { type, title, message, xpAmount, buttons = [{ text: 'OK', style: 'primary' }] } = appModal;
  const borderColor = MODAL_COLORS[type];

  // Layout: 2 buttons side by side, otherwise stack
  const isHorizontal = buttons.length === 2;

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => handleClose()}>
      <Pressable style={styles.overlay} onPress={() => handleClose()}>
        <Animated.View
          style={[
            styles.container,
            {
              borderColor,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Pressable style={styles.content}>
            {/* XP Badge */}
            {xpAmount && (
              <View style={styles.xpBadgeContainer}>
                <Animated.View style={[
                  styles.xpBadge,
                  {
                    transform: [
                      { scale: xpAnim },
                      { translateY: xpAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })}
                    ],
                    opacity: xpAnim
                  }
                ]}>
                  <Text style={styles.xpBadgeText}>+{xpAmount} XP</Text>
                </Animated.View>
              </View>
            )}

            {/* Title */}
            <Text style={styles.title}>{title}</Text>

            {/* Message */}
            <Text style={styles.message}>{message}</Text>

            {/* Buttons */}
            <View style={[styles.buttonContainer, isHorizontal && styles.buttonContainerHorizontal]}>
              {buttons.map((button, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.button,
                    getButtonStyle(button.style),
                    isHorizontal && styles.buttonHorizontal,
                  ]}
                  onPress={() => handleButtonPress(button)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.buttonText, getButtonTextStyle(button.style)]}>
                    {button.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width - 48,
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 24,
    borderWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 10,
  },
  content: {
    width: '100%',
  },
  xpBadgeContainer: {
    width: '100%',
    alignItems: 'center',
  },
  xpBadge: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#166534',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
  },
  xpBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Silkscreen-Bold',
  },
  title: {
    fontSize: 18,
    fontFamily: 'DotGothic16',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    fontFamily: 'Inter',
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  buttonContainerHorizontal: {
    flexDirection: 'row',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 3,
  },
  buttonHorizontal: {
    flex: 1,
    paddingHorizontal: 8,
  },
  primaryButton: {
    backgroundColor: '#FF4B4B',
    borderWidth: 3,
    borderColor: '#CC3C3C',
  },
  destructiveButton: {
    backgroundColor: '#FF4B4B',
    borderWidth: 3,
    borderColor: '#CC3C3C',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    shadowOpacity: 0.15,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Silkscreen',
    textAlign: 'center',
  },
  primaryButtonText: {
    color: '#fff',
  },
  cancelButtonText: {
    color: '#666',
  },
});
