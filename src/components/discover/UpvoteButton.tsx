// Upvote button with heart icon and count
import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type UpvoteButtonProps = {
  upvoteCount: number;
  isUpvoted: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  size?: 'small' | 'medium';
};

export default function UpvoteButton({
  upvoteCount,
  isUpvoted,
  isLoading = false,
  disabled = false,
  onPress,
  size = 'medium',
}: UpvoteButtonProps) {
  const iconSize = size === 'small' ? 18 : 22;
  const fontSize = size === 'small' ? 12 : 14;

  return (
    <Pressable
      style={[
        styles.container,
        size === 'small' && styles.containerSmall,
        isUpvoted && styles.containerActive,
        disabled && styles.containerDisabled,
      ]}
      onPress={onPress}
      disabled={isLoading || disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isUpvoted ? 'Remove upvote' : 'Upvote machine'}
      accessibilityState={{ selected: isUpvoted }}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={isUpvoted ? '#FF4B4B' : '#999'} />
      ) : (
        <View style={styles.content}>
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
        </View>
      )}
    </Pressable>
  );
}

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
