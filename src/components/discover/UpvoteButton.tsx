import { useRef, useImperativeHandle, forwardRef } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type UpvoteButtonProps = {
  upvoteCount: number;
  isUpvoted: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  size?: 'small' | 'medium';
};

export interface UpvoteButtonRef {
  shake: () => void;
}

const UpvoteButton = forwardRef<UpvoteButtonRef, UpvoteButtonProps>(({
  upvoteCount,
  isUpvoted,
  isLoading = false,
  disabled = false,
  onPress,
  size = 'medium',
}, ref) => {
  const iconSize = size === 'small' ? 18 : 22;
  const fontSize = size === 'small' ? 12 : 14;

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useImperativeHandle(ref, () => ({
    shake: () => {
      // Scale and shake sequence
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ])
      ]).start();
    }
  }));

  return (
    <Pressable
      style={[
        styles.container,
        size === 'small' && styles.containerSmall,
        isUpvoted && styles.containerActive,
        disabled && styles.containerDisabled,
      ]}
      onPress={(e) => {
        // Stop propagation to prevent card from handling the press
        e.stopPropagation();
        onPress();
      }}
      disabled={isLoading}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isUpvoted ? 'Remove upvote' : 'Upvote machine'}
      accessibilityState={{ selected: isUpvoted }}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={isUpvoted ? '#FF4B4B' : '#999'} />
      ) : (
        <Animated.View 
          style={[
            styles.content,
            { 
              transform: [
                { translateX: shakeAnim },
                { scale: scaleAnim }
              ] 
            }
          ]}
        >
          <Ionicons
            name={isUpvoted ? 'heart' : 'heart-outline'}
            size={iconSize}
            color={isUpvoted ? '#FF4B4B' : '#666'}
          />
          <Text
            style={[
              styles.count,
              { fontSize },
              isUpvoted && styles.countActive,
            ]}
          >
            {upvoteCount}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
});

export default UpvoteButton;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    minWidth: 60,
  },
  containerSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 50,
  },
  containerActive: {
    backgroundColor: '#FEE2E2',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  count: {
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  countActive: {
    color: '#FF4B4B',
  },
});
