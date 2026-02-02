// Leaderboard toggle component - Global/Friends
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export type LeaderboardType = 'global' | 'friends';

interface LeaderboardToggleProps {
  activeType: LeaderboardType;
  onToggle: (type: LeaderboardType) => void;
}

export default function LeaderboardToggle({ activeType, onToggle }: LeaderboardToggleProps) {
  const { t } = useTranslation();
  const [pressedButton, setPressedButton] = useState<LeaderboardType | null>(null);

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.button,
          activeType === 'global' && styles.activeButton,
          pressedButton === 'global' && !styles.activeButton && styles.pressedButton,
        ]}
        onPress={() => onToggle('global')}
        onPressIn={() => setPressedButton('global')}
        onPressOut={() => setPressedButton(null)}
        accessibilityRole="button"
        accessibilityState={{ selected: activeType === 'global' }}
        hitSlop={4}
      >
        <Text style={[styles.buttonText, activeType === 'global' && styles.activeButtonText]}>
          {t('leaderboard.global')}
        </Text>
      </Pressable>
      <Pressable
        style={[
          styles.button,
          activeType === 'friends' && styles.activeButton,
          pressedButton === 'friends' && activeType !== 'friends' && styles.pressedButton,
        ]}
        onPress={() => onToggle('friends')}
        onPressIn={() => setPressedButton('friends')}
        onPressOut={() => setPressedButton(null)}
        accessibilityRole="button"
        accessibilityState={{ selected: activeType === 'friends' }}
        hitSlop={4}
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
    borderRadius: 4,
    padding: 3,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 3,
    alignItems: 'center',
    minWidth: 70,
  },
  activeButton: {
    backgroundColor: '#FF4B4B',
  },
  pressedButton: {
    backgroundColor: '#e0e0e0',
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
