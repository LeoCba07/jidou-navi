// BadgeRequirementModal - shows locked badge requirements and user progress
import { View, Text, StyleSheet, Modal, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { Badge } from '../../lib/badges';

interface BadgeRequirementModalProps {
  badge: Badge | null;
  userProgress: { current: number; required: number };
  visible: boolean;
  onClose: () => void;
}

export default function BadgeRequirementModal({
  badge,
  userProgress,
  visible,
  onClose,
}: BadgeRequirementModalProps) {
  const { t } = useTranslation();

  if (!badge) return null;

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
        <View style={styles.container}>
          {/* Lock icon and badge name */}
          <View style={styles.header}>
            <Ionicons name="lock-closed" size={20} color="#999" />
            <Text style={styles.badgeName}>{badge.name}</Text>
          </View>

          {/* Badge icon */}
          <View style={styles.iconContainer}>
            {badge.icon_url ? (
              <Image source={{ uri: badge.icon_url }} style={styles.badgeIcon} />
            ) : (
              <View style={styles.badgeIconPlaceholder}>
                <Ionicons name="trophy" size={40} color="#ccc" />
              </View>
            )}
          </View>

          {/* Description / Requirement */}
          <Text style={styles.description}>{badge.description}</Text>

          {/* Progress section */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  badgeName: {
    fontSize: 18,
    fontFamily: 'DotGothic16',
    color: '#2B2B2B',
  },
  iconContainer: {
    marginBottom: 16,
  },
  badgeIcon: {
    width: 64,
    height: 64,
    opacity: 0.5,
  },
  badgeIconPlaceholder: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 32,
  },
  description: {
    fontSize: 14,
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
    fontSize: 13,
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
    fontSize: 13,
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
    fontSize: 14,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
});
