import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Image, 
  useWindowDimensions 
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, SPACING } from '../../theme/constants';
import { useBadgeTranslation } from '../../hooks/useBadgeTranslation';
import { getBadgeImage } from '../../lib/badge-images';
import type { UserBadge } from './EarnedBadgeRow';

interface BadgeSashProps {
  badges: UserBadge[];
  onBadgePress: (badge: UserBadge['badge']) => void;
  onSashPress: () => void;
}

export default function BadgeSash({ badges, onBadgePress, onSashPress }: BadgeSashProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { getBadgeTranslation } = useBadgeTranslation();

  const SASH_WIDTH = width - 32;

  // Show up to 5 badges on the sash
  const displayBadges = badges.slice(0, 5);

  return (
    <View style={styles.container}>
      {/* The Ribbon/Sash */}
      <View style={[styles.sashWrapper, { width: SASH_WIDTH }]}>
        <View style={styles.ribbonTailLeft} />
        
        <Pressable 
          onPress={onSashPress} 
          style={styles.sashBody}
          accessibilityRole="button"
          accessibilityLabel={t('profile.badges')}
          accessibilityHint={t('profile.badgeSashHint')}
        >
          <View style={[styles.patternOverlay, { width: width * 2 }]}>
            {[...Array(20)].map((_, i) => (
              <View key={i} style={styles.patternStripe} />
            ))}
          </View>

          <View style={styles.badgeContainer}>
            {displayBadges.length === 0 ? (
              <Text style={styles.emptyText}>{t('profile.noBadgesYet')}</Text>
            ) : (
              displayBadges.map((userBadge) => {
                const translation = getBadgeTranslation(
                  userBadge.badge.slug,
                  userBadge.badge.name,
                  userBadge.badge.description
                );
                
                return (
                  <Pressable 
                    key={userBadge.id} 
                    style={styles.badgeItem}
                    onPress={() => onBadgePress({ ...userBadge.badge, name: translation.name, description: translation.description })}
                    accessibilityRole="button"
                    accessibilityLabel={`${translation.name}, ${t('machine.verified')}`}
                  >
                    <Image
                      source={getBadgeImage(userBadge.badge.slug) || require('../../../assets/pixel-stat-badges.png')}
                      style={styles.badgeIcon}
                    />
                    <View style={styles.badgeGloss} />
                  </Pressable>
                );
              })
            )}
            
            {badges.length > displayBadges.length && (
              <Pressable 
                onPress={onSashPress} 
                style={styles.moreBadge}
                accessibilityRole="button"
                accessibilityLabel={t('badges.viewAll')}
              >
                <Text style={styles.moreText}>...</Text>
              </Pressable>
            )}
          </View>
        </Pressable>

        <View style={styles.ribbonTailRight} />
      </View>
      
      <Text style={styles.hintText}>{t('profile.badgeSashHint')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  sashWrapper: {
    height: 110,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sashBody: {
    flex: 1,
    height: 85,
    backgroundColor: COLORS.primary,
    borderWidth: 4,
    borderColor: COLORS.text,
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 5,
    overflow: 'hidden',
  },
  ribbonTailLeft: {
    width: 28,
    height: 65,
    backgroundColor: COLORS.primaryDark,
    borderWidth: 4,
    borderColor: COLORS.text,
    marginRight: -10,
    transform: [{ skewY: '20deg' }],
    zIndex: 1,
  },
  ribbonTailRight: {
    width: 28,
    height: 65,
    backgroundColor: COLORS.primaryDark,
    borderWidth: 4,
    borderColor: COLORS.text,
    marginLeft: -10,
    transform: [{ skewY: '-20deg' }],
    zIndex: 1,
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    opacity: 0.15,
    left: -100,
  },
  patternStripe: {
    width: 15,
    height: 200,
    backgroundColor: '#000',
    transform: [{ rotate: '45deg' }],
    marginRight: 15,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  badgeItem: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    position: 'relative',
  },
  badgeIcon: {
    width: 42,
    height: 46,
    resizeMode: 'contain',
  },
  badgeGloss: {
    position: 'absolute',
    top: 4,
    left: 8,
    width: 10,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 10,
    transform: [{ rotate: '-45deg' }],
  },
  emptyText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'DotGothic16',
    color: '#fff',
    fontSize: 14,
  },
  moreBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  moreText: {
    color: '#fff',
    fontFamily: 'Silkscreen',
    fontSize: 18,
    marginTop: -10,
  },
  hintText: {
    marginTop: SPACING.md,
    fontFamily: 'Inter',
    fontSize: 11,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
