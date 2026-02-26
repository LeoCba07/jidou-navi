import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { unregisterPushNotificationsAsync } from '../lib/notifications';
import { useAuthStore } from '../store/authStore';
import { useFriendsStore } from '../store/friendsStore';
import { useAppModal } from './useAppModal';
import type { Friend } from '../store/friendsStore';

export function useAccountActions() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { friends, removeFriend } = useFriendsStore();
  const { showConfirm, showError, showSuccess } = useAppModal();

  const handleLogout = useCallback(() => {
    showConfirm(t('profile.logoutConfirm.title'), t('profile.logoutConfirm.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: async () => {
          await unregisterPushNotificationsAsync();
          await supabase.auth.signOut();
        },
      },
    ]);
  }, [showConfirm, t]);

  const handleRemoveFriend = useCallback((friendId: string) => {
    const friend = friends.find((f) => f.id === friendId);
    showConfirm(
      t('friends.remove'),
      t('friends.removeFriendConfirm', { name: friend?.display_name || friend?.username }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => {
            removeFriend(friendId);
          },
        },
      ]
    );
  }, [friends, showConfirm, removeFriend, t]);

  const handleDeleteAccount = useCallback(() => {
    showConfirm(
      t('profile.deleteAccountConfirm.title'),
      t('profile.deleteAccountConfirm.message'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteAccount'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user) return;

              await unregisterPushNotificationsAsync();

              // @ts-ignore - RPC function to be added in database
              const { error } = await supabase.rpc('delete_user_account');

              if (error) {
                console.error('Delete account error:', error);
                showError(t('common.error'), t('profile.deleteAccountError'));
                return;
              }

              await supabase.auth.signOut();
              showSuccess(t('profile.deleteAccountSuccess.title'), t('profile.deleteAccountSuccess.message'));
            } catch (err) {
              console.error('Delete account error:', err);
              showError(t('common.error'), t('profile.deleteAccountError'));
            }
          },
        },
      ]
    );
  }, [user, showConfirm, showError, showSuccess, t]);

  return { handleLogout, handleRemoveFriend, handleDeleteAccount };
}
