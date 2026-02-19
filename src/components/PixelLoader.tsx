import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, FONTS, SPACING } from '../theme/constants';

interface PixelLoaderProps {
  message?: string;
  size?: number;
  fullScreen?: boolean;
}

export default function PixelLoader({ 
  message, 
  size = 80, 
  fullScreen = false 
}: PixelLoaderProps) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Bouncing vending machine animation
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -15,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Dots loading animation
    const animateDot = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      );
    };

    const dotsAnimation = Animated.parallel([
      animateDot(dot1Anim, 0),
      animateDot(dot2Anim, 200),
      animateDot(dot3Anim, 400),
    ]);

    bounce.start();
    dotsAnimation.start();

    return () => {
      bounce.stop();
      dotsAnimation.stop();
      dot1Anim.setValue(0);
      dot2Anim.setValue(0);
      dot3Anim.setValue(0);
    };
  }, [bounceAnim, dot1Anim, dot2Anim, dot3Anim]);

  const containerStyle = fullScreen ? styles.fullScreen : styles.container;

  return (
    <View 
      style={containerStyle}
      accessibilityRole="progressbar"
      accessibilityLabel={message || "Loading..."}
    >
      <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
        <Image
          source={require('../../assets/icon.png')}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>
      
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
        <Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
        <Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
      </View>

      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 0, // Keep it pixelated/square
  },
  message: {
    marginTop: SPACING.lg,
    fontSize: 16,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
