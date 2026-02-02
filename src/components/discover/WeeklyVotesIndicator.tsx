// Weekly votes remaining indicator
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { MAX_WEEKLY_UPVOTES } from '../../lib/upvotes';

type WeeklyVotesIndicatorProps = {
  remainingVotes: number;
  compact?: boolean;
};

export default function WeeklyVotesIndicator({
  remainingVotes,
  compact = false,
}: WeeklyVotesIndicatorProps) {
  const { t } = useTranslation();
  const usedVotes = MAX_WEEKLY_UPVOTES - remainingVotes;
  const hasVotesLeft = remainingVotes > 0;

  if (compact) {
    return (
      <View style={[styles.compactContainer, !hasVotesLeft && styles.compactContainerEmpty]}>
        <Ionicons
          name="heart"
          size={12}
          color={hasVotesLeft ? '#FF4B4B' : '#999'}
        />
        <Text style={[styles.compactText, !hasVotesLeft && styles.compactTextEmpty]}>
          {remainingVotes}/{MAX_WEEKLY_UPVOTES}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconRow}>
        {Array.from({ length: MAX_WEEKLY_UPVOTES }).map((_, index) => (
          <Ionicons
            key={index}
            name={index < usedVotes ? 'heart' : 'heart-outline'}
            size={16}
            color={index < usedVotes ? '#ccc' : '#FF4B4B'}
          />
        ))}
      </View>
      <Text style={[styles.text, !hasVotesLeft && styles.textEmpty]}>
        {hasVotesLeft
          ? t('discover.votesRemaining', { count: remainingVotes })
          : t('discover.noVotesLeft')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 2,
  },
  text: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#D97706',
  },
  textEmpty: {
    color: '#999',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  compactContainerEmpty: {
    backgroundColor: '#f0f0f0',
  },
  compactText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FF4B4B',
  },
  compactTextEmpty: {
    color: '#999',
  },
});
