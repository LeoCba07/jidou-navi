import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { uploadAvatar } from '../lib/storage';
import { processImage, IMAGE_LIMITS, COMPRESSION_QUALITY } from '../lib/images';
import { useAuthStore } from '../store/authStore';
import { useAppModal } from './useAppModal';

export function useAvatarUpload() {
  const { t } = useTranslation();
  const { user, profile, setProfile } = useAuthStore();
  const { showError, showSuccess } = useAppModal();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());

  async function handleEditAvatar() {
    if (!user) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showError(t('common.error'), t('addMachine.permissionNeeded'));
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: COMPRESSION_QUALITY,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingAvatar(true);
        const asset = result.assets[0];
        const fileName = `avatar_${Date.now()}.jpg`;

        const processedUri = await processImage(asset.uri, { maxDimension: IMAGE_LIMITS.AVATAR });

        const publicUrl = await uploadAvatar(user.id, {
          uri: processedUri,
          type: 'image/jpeg',
          name: fileName,
        });

        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);

        if (error) throw error;

        const newTimestamp = Date.now();
        if (profile) {
          setProfile({ ...profile, avatar_url: publicUrl });
        }
        setAvatarTimestamp(newTimestamp);

        showSuccess(t('common.success'), t('profile.avatarUpdated'));
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      showError(t('common.error'), t('profile.avatarUpdateError'));
    } finally {
      setUploadingAvatar(false);
    }
  }

  return { handleEditAvatar, uploadingAvatar, avatarTimestamp };
}
