// Card component for displaying a pending machine in the admin queue
import { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FONT_SIZES, ICON_SIZES } from '../../theme/constants';
import { getCategoryIconName } from '../../lib/admin';
import type { PendingMachine } from '../../lib/admin';

interface PendingMachineCardProps {
  machine: PendingMachine;
  onPress: () => void;
}

export default function PendingMachineCard({ machine, onPress }: PendingMachineCardProps) {
  const { t } = useTranslation();
  const [photoError, setPhotoError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const timeSinceSubmission = () => {
    const submitted = new Date(machine.created_at);
    const now = new Date();
    const diffMs = now.getTime() - submitted.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return t('admin.daysAgo', { count: diffDays });
    }
    if (diffHours > 0) {
      return t('admin.hoursAgo', { count: diffHours });
    }
    return t('admin.justNow');
  };

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {machine.primary_photo_url && !photoError ? (
        <Image
          source={{ uri: machine.primary_photo_url }}
          style={styles.photo}
          onError={() => setPhotoError(true)}
        />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Ionicons name="image-outline" size={ICON_SIZES.lg} color="#ccc" />
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {machine.name || t('machine.unnamed')}
        </Text>

        {/* Categories preview */}
        {machine.categories && machine.categories.length > 0 && (
          <View style={styles.categoriesRow}>
            {machine.categories.slice(0, 2).map((cat) => (
              <View
                key={cat.id}
                style={[styles.categoryChip, { backgroundColor: cat.color }]}
              >
                {getCategoryIconName(cat.icon_name) && (
                  <Ionicons name={getCategoryIconName(cat.icon_name) as any} size={10} color="#fff" />
                )}
                <Text style={styles.categoryText}>{cat.name}</Text>
              </View>
            ))}
            {machine.categories.length > 2 && (
              <Text style={styles.moreCategories}>+{machine.categories.length - 2}</Text>
            )}
          </View>
        )}

        <View style={styles.metaRow}>
          {machine.contributor_avatar_url && !avatarError ? (
            <Image
              source={{ uri: machine.contributor_avatar_url }}
              style={styles.contributorAvatar}
              onError={() => setAvatarError(true)}
            />
          ) : (
            <Ionicons name="person-outline" size={ICON_SIZES.xs} color="#666" />
          )}
          <Text style={styles.metaText} numberOfLines={1}>
            {machine.contributor_display_name || machine.contributor_username || t('common.user')}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={ICON_SIZES.xs} color="#666" />
          <Text style={styles.metaText}>{timeSinceSubmission()}</Text>
        </View>

        {machine.nearby_count > 0 && (
          <View style={styles.warningRow}>
            <Ionicons name="warning-outline" size={ICON_SIZES.xs} color="#D97706" />
            <Text style={styles.warningText}>
              {t('admin.nearbyMachines', { count: machine.nearby_count })}
            </Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={ICON_SIZES.sm} color="#ccc" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 2,
    padding: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
  },
  photo: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF4B4B',
  },
  photoPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#ddd',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: FONT_SIZES.lg,
    fontFamily: 'Inter-SemiBold',
    color: '#2B2B2B',
    marginBottom: 4,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  contributorAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  categoryText: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  moreCategories: {
    fontSize: FONT_SIZES.xs,
    fontFamily: 'Inter',
    color: '#999',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  metaText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter',
    color: '#666',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  warningText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: 'Inter-SemiBold',
    color: '#D97706',
  },
});
