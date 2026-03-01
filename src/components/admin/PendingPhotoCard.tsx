// Card component for displaying a pending photo in the admin review queue.
// Includes inline approve/reject/ban actions — no separate review screen needed
// since photos don't require location or duplicate checks.
import { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FONT_SIZES, ICON_SIZES } from '../../theme/constants';
import type { PendingPhoto } from '../../lib/admin';

interface PendingPhotoCardProps {
  photo: PendingPhoto;
  onApprove: (photoId: string) => Promise<boolean>;
  onReject: (photoId: string) => Promise<boolean>;
  onBanUser: (userId: string, displayName: string) => Promise<boolean>;
}

export default function PendingPhotoCard({ photo, onApprove, onReject, onBanUser }: PendingPhotoCardProps) {
  const { t } = useTranslation();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isBanning, setIsBanning] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const timeSinceSubmission = () => {
    const submitted = new Date(photo.created_at);
    const diffMs = Date.now() - submitted.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) return t('admin.daysAgo', { count: diffDays });
    if (diffHours > 0) return t('admin.hoursAgo', { count: diffHours });
    return t('admin.justNow');
  };

  const handleApprove = async () => {
    setIsApproving(true);
    await onApprove(photo.id);
    setIsApproving(false);
  };

  const handleReject = async () => {
    setIsRejecting(true);
    await onReject(photo.id);
    setIsRejecting(false);
  };

  const isProcessing = isApproving || isRejecting || isBanning;

  return (
    <View style={styles.card}>
      {/* Photo */}
      {!photoError ? (
        <Image
          source={{ uri: photo.photo_url }}
          style={styles.photo}
          accessibilityRole="image"
          accessibilityLabel={`${t('admin.photoOf')} ${photo.machine_name || t('machine.unnamed')}`}
          onError={() => setPhotoError(true)}
        />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Ionicons name="image-outline" size={ICON_SIZES.lg} color="#ccc" />
        </View>
      )}

      {/* Info */}
      <View style={styles.content}>
        <Text style={styles.machineName} numberOfLines={1}>
          {photo.machine_name || t('machine.unnamed')}
        </Text>

        {photo.machine_address ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={ICON_SIZES.xs} color="#666" />
            <Text style={styles.metaText} numberOfLines={1}>{photo.machine_address}</Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          {photo.uploader_avatar_url ? (
            <Image
              source={{ uri: photo.uploader_avatar_url }}
              style={styles.uploaderAvatar}
            />
          ) : (
            <Ionicons name="person-outline" size={ICON_SIZES.xs} color="#666" />
          )}
          <Text style={styles.metaText} numberOfLines={1}>
            {photo.uploader_display_name || photo.uploader_username || t('common.user')}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={ICON_SIZES.xs} color="#666" />
          <Text style={styles.metaText}>{timeSinceSubmission()}</Text>
        </View>

        {/* Approve / Reject */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.rejectButton, isProcessing && styles.buttonDisabled]}
            onPress={handleReject}
            disabled={isProcessing}
            accessibilityRole="button"
            accessibilityLabel={t('admin.rejectPhoto')}
          >
            {isRejecting ? (
              <ActivityIndicator size="small" color="#FF4B4B" />
            ) : (
              <Ionicons name="close-circle-outline" size={ICON_SIZES.sm} color="#FF4B4B" />
            )}
            <Text style={styles.rejectText}>{t('admin.reject')}</Text>
          </Pressable>

          <Pressable
            style={[styles.approveButton, isProcessing && styles.buttonDisabled]}
            onPress={handleApprove}
            disabled={isProcessing}
            accessibilityRole="button"
            accessibilityLabel={t('admin.approvePhoto')}
          >
            {isApproving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={ICON_SIZES.sm} color="#fff" />
            )}
            <Text style={styles.approveText}>{t('admin.approve')}</Text>
          </Pressable>
        </View>

        {/* Ban uploader */}
        {photo.uploaded_by && (
          <Pressable
            style={[styles.banButton, isProcessing && styles.buttonDisabled]}
            onPress={async () => {
              setIsBanning(true);
              await onBanUser(
                photo.uploaded_by,
                photo.uploader_display_name || photo.uploader_username || t('common.user')
              );
              setIsBanning(false);
            }}
            disabled={isProcessing}
            accessibilityRole="button"
            accessibilityLabel={t('admin.banUser')}
            accessibilityHint={t('admin.banUserHint')}
          >
            {isBanning ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Ionicons name="ban-outline" size={ICON_SIZES.xs} color="#DC2626" />
            )}
            <Text style={styles.banText}>{t('admin.banUser')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
    overflow: 'hidden',
  },
  photo: {
    width: 100,
    height: '100%',
    minHeight: 120,
  },
  photoPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploaderAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  machineName: {
    fontSize: FONT_SIZES.md,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: '#666',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#FF4B4B',
    backgroundColor: '#fff',
  },
  rejectText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Silkscreen',
    color: '#FF4B4B',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 2,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#16A34A',
  },
  approveText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Silkscreen',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  banButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
  },
  banText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
  },
});
