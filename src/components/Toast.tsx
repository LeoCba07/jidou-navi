import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore } from '../store/uiStore';
import { COLORS, SPACING, ICON_SIZES } from '../theme/constants';

const TOAST_DURATION = 3000;

export default function Toast() {
  const toast = useUIStore((state) => state.toast);
  const hideToast = useUIStore((state) => state.hideToast);
  
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hideToast();
    });
  }, [hideToast, slideAnim, opacityAnim]);

  useEffect(() => {
    if (toast) {
      // 1. Reset animation values to initial state for new toasts
      slideAnim.setValue(-120);
      opacityAnim.setValue(0);

      // 2. Show toast
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 60, // Top offset
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // 3. Auto-hide after duration
      const timer = setTimeout(() => {
        dismiss();
      }, toast.duration || TOAST_DURATION);

      return () => clearTimeout(timer);
    }
  }, [toast, dismiss, slideAnim, opacityAnim]);

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      default: return 'information-circle';
    }
  };

  const getThemeColors = () => {
    switch (toast.type) {
      case 'success': return { main: '#10B981', light: '#ECFDF5' };
      case 'error': return { main: COLORS.primary, light: '#FEF2F2' };
      default: return { main: '#3C91E6', light: '#EFF6FF' };
    }
  };

  const theme = getThemeColors();

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          borderColor: theme.main,
        }
      ]}
    >
      <Pressable onPress={dismiss} style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.light }]}>
          <Ionicons 
            name={getIcon()} 
            size={ICON_SIZES.sm} 
            color={theme.main} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.message, { color: COLORS.text }]}>
            {toast.message}
          </Text>
        </View>
        <Ionicons name="close" size={16} color="#ccc" style={styles.closeIcon} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 9999,
    borderWidth: 3,
    borderRadius: 2,
    backgroundColor: '#fff',
    // Hard pixel shadow
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  textContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  message: {
    fontSize: 16,
    fontFamily: 'DotGothic16',
    lineHeight: 20,
  },
  closeIcon: {
    marginLeft: SPACING.sm,
  },
});
