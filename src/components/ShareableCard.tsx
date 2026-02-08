// Shareable photo card for social media after check-in
import { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Analytics } from '../lib/analytics';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

export interface ShareCardData {
  machineId: string;
  machineName: string;
  machineAddress: string;
  machinePhotoUrl: string;
  categories?: { name: string; color: string }[];
  onDismiss?: () => void;
}

export default function ShareableCard() {
  const { t } = useTranslation();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const { shareCard, closeShareCard } = useUIStore();
  const { profile } = useAuthStore();

  function handleClose() {
    closeShareCard();
    shareCard?.onDismiss?.();
  }

  if (!shareCard) return null;

  const { machineName, machineAddress, machinePhotoUrl, categories } = shareCard;
  const username = profile?.username || profile?.display_name || t('common.user');

  async function handleShare() {
    if (!cardRef.current || !shareCard) return;

    setSharing(true);
    try {
      // Capture the card as an image
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        alert(t('share.notAvailable'));
        setSharing(false);
        return;
      }

      // Share the image
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: t('share.dialogTitle'),
        UTI: 'public.png',
      });

      Analytics.track('share_machine', {
        machine_id: shareCard.machineId,
        machine_name: shareCard.machineName,
      });

      // Clean up temp file
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch {
        // Ignore cleanup errors
      }
      
      // Close after sharing
      handleClose();
    } catch (error) {
      console.error('Share error:', error);
    } finally {
      setSharing(false);
    }
  }

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button */}
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#666" />
          </Pressable>

          {/* The shareable card - this gets captured */}
          <View ref={cardRef} style={styles.card} collapsable={false}>
            {/* Machine photo */}
            <View style={styles.photoContainer}>
              {machinePhotoUrl ? (
                <Image
                  source={{ uri: machinePhotoUrl }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.photo, styles.noPhoto]}>
                  <Ionicons name="cube-outline" size={48} color="#ccc" />
                </View>
              )}

              {/* Gradient overlay for text readability */}
              <View style={styles.photoOverlay} />

              {/* Check-in badge */}
              <View style={styles.checkinBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.checkinText}>{t('share.visited')}</Text>
              </View>
            </View>

            {/* Card content */}
            <View style={styles.content}>
              {/* Machine name */}
              <Text style={styles.machineName} numberOfLines={2}>
                {machineName || t('machine.unnamed')}
              </Text>

              {/* Categories */}
              {categories && categories.length > 0 && (
                <View style={styles.categoriesRow}>
                  {categories.slice(0, 3).map((cat, index) => (
                    <View
                      key={index}
                      style={[styles.categoryChip, { backgroundColor: cat.color }]}
                    >
                      <Text style={styles.categoryText}>{cat.name}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Location */}
              {machineAddress && (
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={14} color="#FF4B4B" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {machineAddress}
                  </Text>
                </View>
              )}

              {/* Divider */}
              <View style={styles.divider} />

              {/* User and branding row */}
              <View style={styles.footer}>
                {/* User */}
                <View style={styles.userInfo}>
                  <View style={styles.userAvatar}>
                    <Ionicons name="person" size={14} color="#fff" />
                  </View>
                  <Text style={styles.username}>@{username}</Text>
                </View>

                {/* App branding */}
                <View style={styles.branding}>
                  <Image
                    source={require('../../assets/icon.png')}
                    style={styles.appIcon}
                  />
                  <Text style={styles.appName}>JidouNavi</Text>
                </View>
              </View>
            </View>

            {/* Decorative corner accents */}
            <View style={[styles.cornerAccent, styles.topLeft]} />
            <View style={[styles.cornerAccent, styles.topRight]} />
            <View style={[styles.cornerAccent, styles.bottomLeft]} />
            <View style={[styles.cornerAccent, styles.bottomRight]} />
          </View>

          {/* Share button */}
          <Pressable
            style={[styles.shareButton, sharing && styles.shareButtonDisabled]}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="share-outline" size={20} color="#fff" />
                <Text style={styles.shareButtonText}>{t('share.shareToSocial')}</Text>
              </>
            )}
          </Pressable>

          {/* Skip button */}
          <Pressable style={styles.skipButton} onPress={handleClose}>
            <Text style={styles.skipText}>{t('share.maybeLater')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: -40,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  card: {
    width: CARD_WIDTH,
    maxWidth: 320,
    backgroundColor: '#FDF3E7',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#FF4B4B',
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 10,
  },
  photoContainer: {
    position: 'relative',
    height: 200,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  noPhoto: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
  },
  checkinBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
    gap: 4,
    borderWidth: 2,
    borderColor: '#16A34A',
  },
  checkinText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Silkscreen',
  },
  content: {
    padding: 16,
  },
  machineName: {
    fontSize: 11,
    fontFamily: 'PressStart2P',
    color: '#333',
    lineHeight: 18,
    marginBottom: 10,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  categoryText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter',
    color: '#666',
  },
  divider: {
    height: 2,
    backgroundColor: '#FF4B4B',
    marginBottom: 12,
    opacity: 0.3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3C91E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  appName: {
    fontSize: 10,
    fontFamily: 'PressStart2P',
    color: '#FF4B4B',
  },
  cornerAccent: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: '#FF4B4B',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF4B4B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 2,
    marginTop: 20,
    width: '100%',
    maxWidth: 320,
    borderWidth: 3,
    borderColor: '#CC3C3C',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  shareButtonDisabled: {
    opacity: 0.7,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Silkscreen',
  },
  skipButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Silkscreen',
  },
});
