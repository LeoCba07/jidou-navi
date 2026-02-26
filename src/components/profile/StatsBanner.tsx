import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FONT_SIZES, ICON_SIZES, SPACING } from '../../theme/constants';

const pixelStatAdded = require('../../../assets/pixel-stat-added.png');
const pixelStatBadges = require('../../../assets/pixel-stat-badges.png');
const pixelStatVisits = require('../../../assets/pixel-stat-visits.png');

interface StatsBannerProps {
  contributionCount: number;
  badgeCount: number;
  visitCount: number;
  onBadgePress?: () => void;
}

export default function StatsBanner({ contributionCount, badgeCount, visitCount, onBadgePress }: StatsBannerProps) {
  const { t } = useTranslation();

  const badgeContent = (
    <>
      <Image source={pixelStatBadges} style={styles.icon} />
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{t('profile.badges')}</Text>
      </View>
      {onBadgePress ? (
        <View style={styles.badgeNumberRow}>
          <Text style={styles.number}>{badgeCount}</Text>
          <Ionicons name="chevron-forward" size={ICON_SIZES.xs} color="rgba(255,255,255,0.6)" style={{ marginLeft: 2 }} />
        </View>
      ) : (
        <Text style={styles.number}>{badgeCount}</Text>
      )}
    </>
  );

  return (
    <View style={styles.banner}>
      <View style={styles.column}>
        <Image source={pixelStatAdded} style={styles.icon} />
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{t('profile.machinesAdded')}</Text>
        </View>
        <Text style={styles.number}>{contributionCount}</Text>
      </View>
      <View style={styles.divider} />
      {onBadgePress ? (
        <Pressable
          style={styles.column}
          onPress={onBadgePress}
          accessibilityRole="button"
          accessibilityLabel={t('profile.badges')}
        >
          {badgeContent}
        </Pressable>
      ) : (
        <View style={styles.column}>
          {badgeContent}
        </View>
      )}
      <View style={styles.divider} />
      <View style={styles.column}>
        <Image source={pixelStatVisits} style={styles.icon} />
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{t('profile.machinesVisited')}</Text>
        </View>
        <Text style={styles.number}>{visitCount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    backgroundColor: '#FF4B4B',
    marginHorizontal: -24,
    marginBottom: -24,
    marginTop: 16,
    paddingVertical: 16,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  icon: {
    width: ICON_SIZES.xl,
    height: ICON_SIZES.xl,
  },
  labelContainer: {
    height: SPACING.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Silkscreen',
    color: 'rgba(255, 255, 255, 0.85)',
    textTransform: 'uppercase',
    textAlign: 'center',
    includeFontPadding: false,
  },
  number: {
    fontSize: 28,
    fontFamily: 'DotGothic16',
    color: '#fff',
    includeFontPadding: false,
  },
  badgeNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
