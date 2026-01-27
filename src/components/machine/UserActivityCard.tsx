// Card showing user's visit history for this machine
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from '../SectionHeader';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../theme/constants';

type UserVisit = {
  visited_at: string;
  visitor_number: number;
};

type UserActivityCardProps = {
  userVisit: UserVisit | null;
  isLoggedIn: boolean;
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function UserActivityCard({ userVisit, isLoggedIn }: UserActivityCardProps) {
  const { t } = useTranslation();

  if (!isLoggedIn) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionHeader title={t('machine.yourActivity')} showLine />
      <View style={styles.card}>
        {userVisit ? (
          <>
            <View style={styles.row}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.text}>
                {t('machine.youVisitedOn', { date: formatDate(userVisit.visited_at) })}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.trophy}>🏆</Text>
              <Text style={styles.celebratoryText}>
                {t('machine.youAreVisitor', { number: userVisit.visitor_number })}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.notVisitedContainer}>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={20} color={COLORS.textMuted} />
              <Text style={styles.notVisitedText}>
                {t('machine.neverCheckedIn')}
              </Text>
            </View>
            <Text style={styles.hintText}>
              {t('machine.visitToEarn')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.xxl,
  },
  card: {
    backgroundColor: '#FEFCF9',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.backgroundDark,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  text: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.backgroundDark,
    marginVertical: SPACING.md,
  },
  trophy: {
    fontSize: 18,
  },
  celebratoryText: {
    fontSize: 14,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.text,
  },
  notVisitedContainer: {
    gap: SPACING.xs,
  },
  notVisitedText: {
    fontSize: 14,
    fontFamily: FONTS.body,
    color: COLORS.textMuted,
  },
  hintText: {
    fontSize: 13,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    marginLeft: 28,
  },
});
