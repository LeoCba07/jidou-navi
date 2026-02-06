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

export default function UserAvatar({
  url,
  size = 40,
  style,
  borderWidth = 0,
  borderColor = 'transparent',
  showFallbackIcon = false,
}: UserAvatarProps) {
  const [error, setError] = useState(false);

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
      onError={() => setError(true)}
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
