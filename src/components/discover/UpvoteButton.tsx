import { useRef, useImperativeHandle, forwardRef } from 'react';
import { Pressable, Text, Image, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { FONT_SIZES, ICON_SIZES } from '../../theme/constants';

const HEART_ICON = require('../../../assets/pixel-ui-heart.png');

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
  const iconSize = size === 'small' ? ICON_SIZES.sm : ICON_SIZES.md;
  const fontSize = size === 'small' ? FONT_SIZES.xs : FONT_SIZES.md;

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
      disabled={isLoading || disabled}
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
          <Image
            source={HEART_ICON}
            style={{
              width: iconSize,
              height: iconSize,
              opacity: isUpvoted ? 1 : 0.35,
            }}
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
