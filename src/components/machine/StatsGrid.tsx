// 2x2 stats grid showing visits, verifications, status, last verified
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, VERIFICATION_THRESHOLD } from '../../theme/constants';

type StatsGridProps = {
  visitCount: number;
  verificationCount: number;
  isActive: boolean;
  lastVerifiedText: string | null;
  freshnessColor: string;
};

export function StatsGrid({
  visitCount,
  verificationCount,
  isActive,
  lastVerifiedText,
  freshnessColor,
}: StatsGridProps) {
  const { t } = useTranslation();

  const isVerified = verificationCount >= VERIFICATION_THRESHOLD;

  return (
    <View style={styles.container}>
      {/* Row 1 */}
      <View style={styles.row}>
        <View style={styles.cell}>
          <Ionicons name="eye-outline" size={18} color={COLORS.secondary} />
          <Text style={styles.value}>{visitCount}</Text>
          <Text style={styles.label}>{t('machine.stats.visits')}</Text>
        </View>
        <View style={styles.cell}>
          <Ionicons name={isVerified ? 'shield-checkmark' : 'shield-checkmark-outline'} size={18} color={isVerified ? COLORS.secondary : COLORS.success} />
          <Text style={[styles.value, isVerified && { color: COLORS.secondary }]}>{verificationCount}</Text>
          <Text style={styles.label}>{t('machine.stats.verified')}</Text>
        </View>
      </View>
      {/* Row 2 */}
      <View style={styles.row}>
        <View style={styles.cell}>
          <Ionicons
            name={isVerified ? 'shield-checkmark' : isActive ? 'checkmark-circle' : 'help-circle'}
            size={18}
            color={isVerified ? COLORS.secondary : isActive ? COLORS.success : COLORS.warning}
          />
          <Text style={[styles.value, { color: isVerified ? COLORS.secondary : isActive ? COLORS.success : COLORS.warning }]}>
            {isVerified ? t('machine.verified') : isActive ? t('machine.active') : t('machine.unverified')}
          </Text>
          <Text style={styles.label}>{t('machine.stats.status')}</Text>
        </View>
        <View style={styles.cell}>
          <View style={[styles.freshnessIndicator, { backgroundColor: freshnessColor }]} />
          <Text style={styles.value} numberOfLines={1}>
            {lastVerifiedText || t('machine.stats.never')}
          </Text>
          <Text style={styles.label}>{t('machine.stats.lastVerified')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cell: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: '#eee',
  },
  value: {
    fontSize: 16,
    fontFamily: FONTS.title,
    color: COLORS.text,
  },
  label: {
    fontSize: 11,
    fontFamily: FONTS.bodySemiBold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  freshnessIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
