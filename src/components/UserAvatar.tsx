import React, { useState, useEffect } from 'react';
import { Image, ImageStyle, StyleProp, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_AVATAR = require('../../assets/default-avatar.jpg');

interface UserAvatarProps {
  url?: string | null;
  size?: number;
  style?: StyleProp<ImageStyle>;
  borderWidth?: number;
  borderColor?: string;
  showFallbackIcon?: boolean;
}

/**
 * A reusable Avatar component that handles:
 * 1. Remote image loading
 * 2. Fallback to default local image if URL is missing or broken
 * 3. Error handling with state
 */
export default function UserAvatar({
  url,
  size = 40,
  style,
  borderWidth = 0,
  borderColor = 'transparent',
  showFallbackIcon = false,
}: UserAvatarProps) {
  const [error, setError] = useState(false);

  // Reset error when URL changes
  useEffect(() => {
    setError(false);
  }, [url]);

  const containerStyle: StyleProp<ImageStyle> = [
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth,
      borderColor,
    },
    style,
  ];

  // If no URL or there was an error loading the remote image
  if (!url || error) {
    if (showFallbackIcon) {
      return (
        <View style={[styles.container, containerStyle, styles.fallbackContainer]}>
          <Ionicons name="person" size={size * 0.6} color="#ccc" />
        </View>
      );
    }
    return (
      <Image
        source={DEFAULT_AVATAR}
        style={[styles.container, containerStyle]}
      />
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={[styles.container, containerStyle]}
      onError={() => {
        console.warn(`[UserAvatar] Failed to load image: ${url}`);
        setError(true);
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
});