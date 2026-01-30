// StatProgressCard - displays stat with progress bar and next milestone badge
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Badge } from '../../lib/badges';
import { useBadgeTranslation } from '../../hooks/useBadgeTranslation';

interface StatProgressCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  currentCount: number;
  color: string;
  triggerType: 'visit_count' | 'contribution_count' | null;
  allBadges: Badge[];
}

function getNextMilestone(
  currentCount: number,
  triggerType: string | null,
  allBadges: Badge[]
): Badge | null {
  if (!triggerType) return null;

  const relevantBadges = allBadges
    .filter((b) => b.trigger_type === triggerType && b.trigger_value?.count)
    .sort((a, b) => (a.trigger_value?.count || 0) - (b.trigger_value?.count || 0));

  return relevantBadges.find((b) => (b.trigger_value?.count || 0) > currentCount) || null;
}

export default function StatProgressCard({
  icon,
  label,
  currentCount,
  color,
  triggerType,
  allBadges,
}: StatProgressCardProps) {
  const { t } = useTranslation();
  const { getBadgeTranslation } = useBadgeTranslation();
  const nextBadge = getNextMilestone(currentCount, triggerType, allBadges);
  const nextBadgeTranslation = nextBadge ? getBadgeTranslation(nextBadge.slug, nextBadge.name) : null;
  const nextTarget = nextBadge?.trigger_value?.count || 0;

  // Calculate progress percentage
  // If no next badge, show 100% (all milestones complete)
  const progress = nextBadge
    ? Math.min((currentCount / nextTarget) * 100, 100)
    : 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progress}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
        <Text style={styles.countText}>
          {nextBadge ? `${currentCount}/${nextTarget}` : currentCount}
        </Text>
      </View>

      {nextBadge && nextBadgeTranslation && (
        <Text style={styles.nextMilestone}>
          {t('profile.nextMilestone')}: "{nextBadgeTranslation.name}"
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 2,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#2B2B2B',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 0,
  },
  countText: {
    fontSize: 14,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
    minWidth: 50,
    textAlign: 'right',
  },
  nextMilestone: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#666',
    marginTop: 8,
  },
});
