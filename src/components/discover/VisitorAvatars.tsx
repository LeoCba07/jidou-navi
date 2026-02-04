// Overlapping circular avatars for machine visitors
import { View, Image, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { MachineVisitor } from '../../lib/machines';

const DEFAULT_AVATAR = require('../../../assets/default-avatar.jpg');

type VisitorAvatarsProps = {
  visitors: MachineVisitor[];
  totalCount?: number;
  maxDisplay?: number;
  size?: number;
  onAvatarPress?: (userId: string) => void;
};

export default function VisitorAvatars({
  visitors,
  totalCount = 0,
  maxDisplay = 5,
  size = 28,
  onAvatarPress,
}: VisitorAvatarsProps) {
  const displayVisitors = visitors.slice(0, maxDisplay);
  const overflowCount = totalCount > maxDisplay ? totalCount - maxDisplay : 0;
  const overlap = size * 0.3;

  const handlePress = (userId: string) => {
    if (onAvatarPress) {
      onAvatarPress(userId);
    } else {
      router.push(`/profile/${userId}`);
    }
  };

  if (displayVisitors.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.avatarRow, { height: size }]}>
        {displayVisitors.map((visitor, index) => (
          <Pressable
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
            onPress={() => handlePress(visitor.user_id)}
            accessibilityRole="button"
            accessibilityLabel={visitor.display_name || visitor.username || 'User profile'}
          >
            <Image
              source={visitor.avatar_url ? { uri: visitor.avatar_url } : DEFAULT_AVATAR}
              style={[
                styles.avatar,
                {
                  width: size - 4,
                  height: size - 4,
                  borderRadius: (size - 4) / 2,
                },
              ]}
            />
          </Pressable>
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
    </View>
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
