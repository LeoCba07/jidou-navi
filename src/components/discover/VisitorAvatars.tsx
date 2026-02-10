// Overlapping circular avatars for machine visitors
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { MachineVisitor } from '../../lib/machines';
import UserAvatar from '../UserAvatar';

type VisitorAvatarsProps = {
  visitors: MachineVisitor[];
  totalCount?: number;
  maxDisplay?: number;
  size?: number;
  onPress?: () => void;
};

export default function VisitorAvatars({
  visitors,
  totalCount = 0,
  maxDisplay = 5,
  size = 28,
  onPress,
}: VisitorAvatarsProps) {
  const displayVisitors = visitors.slice(0, maxDisplay);
  const overflowCount = totalCount > maxDisplay ? totalCount - maxDisplay : 0;
  const overlap = size * 0.3;

  if (displayVisitors.length === 0) {
    return null;
  }

  return (
    <Pressable 
      style={styles.container} 
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="See recent visitors"
    >
      <View style={[styles.avatarRow, { height: size }]}>
        {displayVisitors.map((visitor, index) => (
          <View
            key={visitor.user_id}
            style={[
              styles.avatarWrapper,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                marginLeft: index === 0 ? 0 : -overlap,
                zIndex: displayVisitors.length - index,
              },
            ]}
          >
            <UserAvatar
              url={visitor.avatar_url}
              size={size - 4}
              style={styles.avatar}
            />
          </View>
        ))}
        {overflowCount > 0 && (
          <View
            style={[
              styles.overflowBadge,
              {
                height: size,
                borderRadius: size / 2,
                marginLeft: -overlap,
                paddingHorizontal: size * 0.3,
              },
            ]}
          >
            <Text style={[styles.overflowText, { fontSize: size * 0.4 }]}>
              +{overflowCount}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#f0f0f0',
  },
  overflowBadge: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  overflowText: {
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
});
