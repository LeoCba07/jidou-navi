import { View, Text, Pressable, Image, StyleSheet, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppModal } from '../../hooks/useAppModal';
import { FONT_SIZES, ICON_SIZES } from '../../theme/constants';

const pixelCoffee = require('../../../assets/pixel-coffee.png');
const pixelHeart = require('../../../assets/pixel-ui-heart.png');

export default function SupportSection() {
  const { t } = useTranslation();
  const { showInfo } = useAppModal();

  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Image source={pixelHeart} style={[{ width: ICON_SIZES.sm, height: ICON_SIZES.sm }, styles.sectionTitleIcon]} />
        <Text style={styles.sectionTitle}>{t('profile.supportUs')}</Text>
      </View>
      <View style={styles.supportContainer}>
        <Image source={pixelCoffee} style={styles.coffeeImage} />
        <Text style={styles.supportText}>{t('profile.supportDescription')}</Text>
        <Pressable
          style={styles.supportButton}
          onPress={() => {
            const supportUrl = 'https://buymeacoffee.com/jidou.navi';
            Linking.openURL(supportUrl).catch(() => {
              showInfo(t('profile.supportUs'), t('profile.supportLinkError'));
            });
          }}
          accessibilityRole="button"
          accessibilityLabel={t('profile.supportButton')}
        >
          <Image source={pixelHeart} style={{ width: ICON_SIZES.sm, height: ICON_SIZES.sm, tintColor: '#fff' }} />
          <Text style={styles.supportButtonText}>{t('profile.supportButton')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitleIcon: {
    marginTop: -2,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter-Bold',
    color: '#2B2B2B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coffeeImage: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: 8,
  },
  supportContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  supportText: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter',
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF4B4B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 3,
  },
  supportButtonText: {
    fontSize: FONT_SIZES.lg,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
});
