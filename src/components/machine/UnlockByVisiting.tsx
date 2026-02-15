// Vertical list showing badges user can unlock by visiting this machine
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from '../SectionHeader';
import { getUnlockableBadgesForMachine, type BadgeOpportunity } from '../../lib/badges';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../../theme/constants';
import { useBadgeTranslation } from '../../hooks/useBadgeTranslation';

type UnlockByVisitingProps = {
  machineCategories: string[];
  isLoggedIn: boolean;
};

function BadgeProgressCard({ opportunity }: { opportunity: BadgeOpportunity }) {
  const { t } = useTranslation();
  const { getBadgeTranslation } = useBadgeTranslation();
  const { badge, currentProgress, requiredProgress, progressPercent, willUnlockWithVisit, remaining } = opportunity;
  const translation = getBadgeTranslation(badge.slug, badge.name, badge.description);

  return (
    <View style={[styles.badgeCard, willUnlockWithVisit && styles.badgeCardHighlight]}>
      <View style={styles.badgeHeader}>
        <Text style={styles.badgeEmoji}>
          {badge.icon_url || '🏆'}
        </Text>
        <View style={styles.badgeInfo}>
          <Text style={styles.badgeName}>{translation.name}</Text>
          <Text style={styles.badgeProgress}>
            {t('machine.progressCount', { current: currentProgress, required: requiredProgress })}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
      </View>

      {/* Motivational message */}
      <Text style={[styles.motivationalText, willUnlockWithVisit && styles.unlockText]}>
        {willUnlockWithVisit
          ? `${t('machine.thisWillUnlock')} 🎉`
          : t('machine.visitMoreToUnlock', { count: remaining })}
      </Text>
    </View>
  );
}

export function UnlockByVisiting({ machineCategories, isLoggedIn }: UnlockByVisitingProps) {
  const { t } = useTranslation();
  const [opportunities, setOpportunities] = useState<BadgeOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOpportunities() {
      if (!isLoggedIn) {
        setLoading(false);
        return;
      }

      try {
        const data = await getUnlockableBadgesForMachine(machineCategories);
        setOpportunities(data);
      } catch (error) {
        console.error('Error fetching badge opportunities:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchOpportunities();
  }, [machineCategories, isLoggedIn]);

  if (!isLoggedIn || loading) {
    if (loading && isLoggedIn) {
      return (
        <View style={styles.container}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      );
    }
    return null;
  }

  if (opportunities.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionHeader title={t('machine.unlockByVisiting')} showLine />
      <View style={styles.cardList}>
        {opportunities.map((opportunity) => (
          <BadgeProgressCard key={opportunity.badge.id} opportunity={opportunity} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.xxl,
  },
  cardList: {
    gap: SPACING.md,
  },
  badgeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#eee',
  },
  badgeCardHighlight: {
    borderColor: COLORS.success,
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: FONT_SIZES.md,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text,
  },
  badgeProgress: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  motivationalText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
  unlockText: {
    color: COLORS.success,
    fontFamily: FONTS.bodySemiBold,
  },
});
