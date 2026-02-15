// BadgeRequirementModal - shows locked badge requirements and user progress
import { View, Text, StyleSheet, Modal, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FONT_SIZES, ICON_SIZES } from '../../theme/constants';
import type { Badge } from '../../lib/badges';
import { useBadgeTranslation } from '../../hooks/useBadgeTranslation';

import { getBadgeImage } from '../../lib/badge-images';

interface BadgeRequirementModalProps {
  badge: Badge | null;
  userProgress: { current: number; required: number };
  visible: boolean;
  onClose: () => void;
  isEarned?: boolean;
}

export default function BadgeRequirementModal({
  badge,
  userProgress,
  visible,
  onClose,
  isEarned = false,
}: BadgeRequirementModalProps) {
  const { t } = useTranslation();
  const { getBadgeTranslation } = useBadgeTranslation();

  if (!badge) return null;

  const translation = getBadgeTranslation(badge.slug, badge.name, badge.description);
  const badgeImage = getBadgeImage(badge.slug);

  const progressPercent = userProgress.required > 0
    ? Math.min((userProgress.current / userProgress.required) * 100, 100)
    : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, isEarned && styles.containerEarned]}>
          {/* Lock icon and badge name */}
          <View style={styles.header}>
            {!isEarned && <Ionicons name="lock-closed" size={ICON_SIZES.sm} color="#999" />}
            {isEarned && <Ionicons name="trophy" size={ICON_SIZES.sm} color="#F59E0B" />}
            <Text style={styles.badgeName}>{translation.name}</Text>
          </View>

          {/* Badge icon */}
          <View style={styles.iconContainer}>
            {badge.icon_url ? (
              <Image source={{ uri: badge.icon_url }} style={[styles.badgeIcon, !isEarned && styles.badgeIconLocked]} />
            ) : badgeImage ? (
              <Image source={badgeImage} style={[styles.badgeIcon, !isEarned && styles.badgeIconLocked]} />
            ) : (
              <View style={styles.badgeIconPlaceholder}>
                <Ionicons name="trophy" size={ICON_SIZES.xl} color="#ccc" />
              </View>
            )}
          </View>

          {/* Description / Requirement */}
          <Text style={styles.description}>{translation.description}</Text>

          {/* Progress section - only if not earned */}
          {!isEarned && (
            <>
              <View style={styles.progressSection}>
                <Text style={styles.progressLabel}>
                  {t('profile.progress')}: {userProgress.current}/{userProgress.required} ({Math.round(progressPercent)}%)
                </Text>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progressPercent}%` },
                    ]}
                  />
                </View>
              </View>

              {/* Encouragement text */}
              <Text style={styles.encouragement}>{t('profile.keepExploring')}</Text>
            </>
          )}

          {isEarned && (
            <Text style={styles.earnedLabel}>
              {t('profile.unlockedBadges')}
            </Text>
          )}

          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{t('profile.gotIt')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FF4B4B',
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
    elevation: 5,
  },
  containerEarned: {
    borderColor: '#F59E0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  badgeName: {
    fontSize: FONT_SIZES.xl,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
  },
  iconContainer: {
    marginBottom: 16,
  },
  badgeIcon: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  badgeIconLocked: {
    opacity: 0.5,
  },
  badgeIconPlaceholder: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 40,
  },
  earnedLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Silkscreen',
    color: '#F59E0B',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter',
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  progressSection: {
    width: '100%',
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#2B2B2B',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF4B4B',
  },
  encouragement: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  closeButton: {
    backgroundColor: '#FF4B4B',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 2,
  },
  closeButtonText: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
});
