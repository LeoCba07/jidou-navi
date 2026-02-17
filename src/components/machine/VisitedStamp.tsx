import { View, Text, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FONT_SIZES, ICON_SIZES } from '../../theme/constants';

type Props = {
  size?: 'small' | 'default';
};

export default function VisitedStamp({ size = 'default' }: Props) {
  const { t } = useTranslation();
  const isSmall = size === 'small';

  return (
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      <View style={[styles.stamp, isSmall && styles.stampSmall]}>
        <Image
          source={require('../../../assets/pixel-visited-stamp.png')}
          style={[styles.icon, isSmall && styles.iconSmall]}
        />
        <Text style={[styles.text, isSmall && styles.textSmall]} numberOfLines={1}>{t('share.visited')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
    width: 110,
    height: 110,
    overflow: 'hidden',
  },
  containerSmall: {
    width: 85,
    height: 85,
  },
  stamp: {
    position: 'absolute',
    top: 25,
    left: -70,
    width: 220,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 75, 75, 0.94)',
    paddingVertical: 4,
    gap: 5,
    transform: [{ rotate: '-45deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 5,
  },
  stampSmall: {
    top: 18,
    left: -52,
    width: 170,
    paddingVertical: 3,
    gap: 4,
  },
  icon: {
    width: ICON_SIZES.sm,
    height: ICON_SIZES.sm,
    borderRadius: 9,
  },
  iconSmall: {
    width: ICON_SIZES.xs,
    height: ICON_SIZES.xs,
    borderRadius: 7,
  },
  text: {
    color: '#fff',
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Silkscreen',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  textSmall: {
    fontSize: FONT_SIZES.xs,
  },
});
