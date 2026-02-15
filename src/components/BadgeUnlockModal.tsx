// Badge unlock celebration popup
import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import { useBadgeTranslation } from '../hooks/useBadgeTranslation';
import { getBadgeImage } from '../lib/badge-images';

const { width } = Dimensions.get('window');

export default function BadgeUnlockModal() {
  const { t } = useTranslation();
  const { getBadgeTranslation } = useBadgeTranslation();
  const { badgePopup, closeBadgePopup } = useUIStore();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (badgePopup) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);

      // Play entrance animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [badgePopup]);

  function handleClose() {
    // Play exit animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      closeBadgePopup();
    });
  }

  function handleViewAllBadges() {
    onDismiss?.();
    handleClose();
    // Navigate to profile which shows badges
    router.push('/(tabs)/profile');
  }

  if (!badgePopup) return null;

  const { badges, onDismiss } = badgePopup;
  const title = badges.length === 1 ? t('badges.earned') : t('badges.earnedPlural');

  // For the main icon, use the first badge's image or a default trophy
  const mainBadgeImage = badges.length > 0 ? getBadgeImage(badges[0].slug) : null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Main Badge/Trophy icon */}
          <View style={styles.iconContainer}>
            {mainBadgeImage ? (
              <Image source={mainBadgeImage} style={styles.mainBadgeIcon} />
            ) : (
              <Text style={styles.trophyIcon}>🏆</Text>
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Badges list */}
          <View style={styles.badgesList}>
            {badges.map((badge) => {
              const translation = getBadgeTranslation(badge.slug, badge.name, badge.description);
              const badgeImage = getBadgeImage(badge.slug);
              return (
                <View key={badge.id} style={styles.badgeItem}>
                  <View style={styles.badgeIconWrapper}>
                    {badgeImage ? (
                      <Image source={badgeImage} style={styles.smallBadgeIcon} />
                    ) : (
                      <Text style={styles.badgeEmoji}>🎖️</Text>
                    )}
                  </View>
                  <View style={styles.badgeInfo}>
                    <Text style={styles.badgeName}>{translation.name}</Text>
                    <Text style={styles.badgeDescription}>{translation.description}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={styles.viewAllButton}
              onPress={handleViewAllBadges}
              accessibilityRole="button"
              accessibilityLabel={t('badges.viewAll')}
            >
              <Text style={styles.viewAllText}>{t('badges.viewAll')}</Text>
            </Pressable>

            <Pressable
              style={styles.dismissButton}
              onPress={() => {
                handleClose();
                onDismiss?.();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('badges.awesome')}
            >
              <Text style={styles.dismissText}>{t('badges.awesome')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: width - 48,
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 24,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FF4B4B',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 0,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 4,
    backgroundColor: '#FFF3CD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFD966',
  },
  trophyIcon: {
    fontSize: 40,
  },
  mainBadgeIcon: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  smallBadgeIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 18,
    fontFamily: 'DotGothic16',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  badgesList: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 2,
    gap: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  badgeIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 2,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF4B4B',
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 2,
  },
  badgeDescription: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#666',
    lineHeight: 18,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  viewAllButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Silkscreen',
    color: '#3C91E6',
  },
  dismissButton: {
    backgroundColor: '#FF4B4B',
    paddingVertical: 14,
    borderRadius: 2,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#CC3C3C',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 3,
  },
  dismissText: {
    fontSize: 15,
    color: '#fff',
    fontFamily: 'Silkscreen',
  },
});
