import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  Pressable, 
  ScrollView, 
  Image, 
  useWindowDimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SPACING, FONT_SIZES, ICON_SIZES, SHADOWS } from '../../theme/constants';
import { Badge, calculateBadgeProgress } from '../../lib/badges';
import { useBadgeTranslation } from '../../hooks/useBadgeTranslation';
import { getBadgeImage } from '../../lib/badge-images';
import type { UserBadge } from './EarnedBadgeRow';
import BadgeRequirementModal from './BadgeRequirementModal';

interface BadgeCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  allBadges: Badge[];
  earnedBadges: UserBadge[];
  userStats: {
    visit_count: number;
    contribution_count: number;
    verification_count?: number;
  };
}

export default function BadgeCollectionModal({
  visible,
  onClose,
  allBadges,
  earnedBadges,
  userStats,
}: BadgeCollectionModalProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { getBadgeTranslation } = useBadgeTranslation();
  const earnedBadgeIds = new Set(earnedBadges.map((ub) => ub.badge.id));

  const COLUMN_COUNT = 3;
  const ITEM_SIZE = (width - (SPACING.lg * 2) - (SPACING.md * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

  // State for the nested detail modal
  const [selectedBadge, setSelectedBadge] = useState<{
    badge: Badge;
    progress: { current: number; required: number };
    isEarned: boolean;
  } | null>(null);

  function handleBadgePress(badge: Badge, isEarned: boolean) {
    const translation = getBadgeTranslation(badge.slug, badge.name, badge.description);
    const progress = calculateBadgeProgress(badge, userStats);
    
    setSelectedBadge({ 
      badge: { ...badge, name: translation.name, description: translation.description }, 
      progress: { current: isEarned ? 0 : progress.current, required: isEarned ? 0 : progress.required }, 
      isEarned 
    });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('profile.badges')}</Text>
          <Pressable 
            onPress={onClose} 
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <Ionicons name="close" size={ICON_SIZES.md} color={COLORS.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{earnedBadges.length}</Text>
              <Text style={styles.statLabel}>{t('profile.unlockedBadges')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{allBadges.length - earnedBadges.length}</Text>
              <Text style={styles.statLabel}>{t('profile.lockedBadges')}</Text>
            </View>
          </View>

          <View style={styles.grid}>
            {allBadges.map((badge) => {
              const isEarned = earnedBadgeIds.has(badge.id);
              const translation = getBadgeTranslation(badge.slug, badge.name, badge.description);
              
              return (
                <Pressable
                  key={badge.id}
                  style={[
                    styles.badgeItem,
                    { width: ITEM_SIZE, height: ITEM_SIZE * 1.2 },
                    !isEarned && styles.badgeItemLocked
                  ]}
                  onPress={() => handleBadgePress(badge, isEarned)}
                  accessibilityRole="button"
                  accessibilityLabel={`${translation.name}, ${isEarned ? t('machine.verified') : t('profile.pendingReview')}`}
                  accessibilityHint={t('profile.badgeSashHint')}
                >
                  <View style={styles.iconWrapper}>
                    <Image
                      source={getBadgeImage(badge.slug) || require('../../../assets/pixel-stat-badges.png')}
                      style={[
                        { width: ITEM_SIZE * 0.5, height: ITEM_SIZE * 0.5 },
                        styles.badgeIcon,
                        !isEarned && styles.badgeIconLocked
                      ]}
                    />
                    {!isEarned && (
                      <View style={styles.lockOverlay}>
                        <Ionicons name="lock-closed" size={12} color={COLORS.textLight} />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.badgeName, !isEarned && styles.badgeNameLocked]} numberOfLines={2}>
                    {translation.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Nested Badge Detail Modal */}
        {selectedBadge && (
          <BadgeRequirementModal
            visible={!!selectedBadge}
            badge={selectedBadge.badge}
            userProgress={selectedBadge.progress}
            isEarned={selectedBadge.isEarned}
            onClose={() => setSelectedBadge(null)}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.backgroundDark,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontFamily: 'DotGothic16',
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
    alignItems: 'center',
    ...SHADOWS.pixel,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'DotGothic16',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Silkscreen',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  badgeItem: {
    backgroundColor: '#fff',
    padding: SPACING.sm,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.05)',
    ...SHADOWS.pixel,
    marginBottom: SPACING.sm,
  },
  badgeItemLocked: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.backgroundDark,
    borderStyle: 'dashed',
    elevation: 0,
    shadowOpacity: 0,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  badgeIcon: {
    resizeMode: 'contain',
  },
  badgeIconLocked: {
    opacity: 0.4,
  },
  lockOverlay: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.surface,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.backgroundDark,
  },
  badgeName: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.text,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: COLORS.textLight,
  },
});
