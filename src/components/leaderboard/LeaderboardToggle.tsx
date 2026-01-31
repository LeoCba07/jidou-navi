// Leaderboard toggle component - Global/Friends
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export type LeaderboardType = 'global' | 'friends';

interface LeaderboardToggleProps {
  activeType: LeaderboardType;
  onToggle: (type: LeaderboardType) => void;
}

export default function LeaderboardToggle({ activeType, onToggle }: LeaderboardToggleProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, activeType === 'global' && styles.activeButton]}
        onPress={() => onToggle('global')}
        accessibilityRole="button"
        accessibilityState={{ selected: activeType === 'global' }}
      >
        <Text style={[styles.buttonText, activeType === 'global' && styles.activeButtonText]}>
          {t('leaderboard.global')}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.button, activeType === 'friends' && styles.activeButton]}
        onPress={() => onToggle('friends')}
        accessibilityRole="button"
        accessibilityState={{ selected: activeType === 'friends' }}
      >
        <Text style={[styles.buttonText, activeType === 'friends' && styles.activeButtonText]}>
          {t('leaderboard.friends')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    padding: 3,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  button: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 2,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#FF4B4B',
  },
  buttonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  activeButtonText: {
    color: '#fff',
  },
});
