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
} from 'react-native';
import { router } from 'expo-router';
import { useUIStore } from '../store/uiStore';

const { width } = Dimensions.get('window');

export default function BadgeUnlockModal() {
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
  const title = badges.length === 1 ? 'Badge Earned!' : 'Badges Earned!';

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
          {/* Trophy icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.trophyIcon}>🏆</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Badges list */}
          <View style={styles.badgesList}>
            {badges.map((badge, index) => (
              <View key={badge.id} style={styles.badgeItem}>
                <View style={styles.badgeIconWrapper}>
                  <Text style={styles.badgeEmoji}>🎖️</Text>
                </View>
                <View style={styles.badgeInfo}>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDescription}>{badge.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={styles.viewAllButton}
              onPress={handleViewAllBadges}
              accessibilityRole="button"
              accessibilityLabel="View all badges"
            >
              <Text style={styles.viewAllText}>View All Badges</Text>
            </Pressable>

            <Pressable
              style={styles.dismissButton}
              onPress={() => {
                handleClose();
                onDismiss?.();
              }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss badge notification"
            >
              <Text style={styles.dismissText}>Awesome!</Text>
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
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3CD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  trophyIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
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
    borderRadius: 12,
    gap: 12,
  },
  badgeIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: 24,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  badgeDescription: {
    fontSize: 13,
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
    fontSize: 15,
    color: '#3C91E6',
    fontWeight: '500',
  },
  dismissButton: {
    backgroundColor: '#FF4B4B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});
