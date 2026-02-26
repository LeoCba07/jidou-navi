import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useFriendsStore } from '../store/friendsStore';

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'loading';

export function useFriendshipStatus(targetUserId: string | undefined) {
  const { user } = useAuthStore();
  const friends = useFriendsStore((s) => s.friends);
  const storeSendRequest = useFriendsStore((s) => s.sendRequest);
  const storeAcceptRequest = useFriendsStore((s) => s.acceptRequest);
  const storeLoadFriends = useFriendsStore((s) => s.loadFriends);
  const [status, setStatus] = useState<FriendshipStatus>('loading');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);

  useEffect(() => {
    if (!targetUserId || !user) {
      setStatus('none');
      return;
    }

    // Check friends store first (instant for accepted)
    const isFriend = friends.some((f) => f.id === targetUserId);
    if (isFriend) {
      setStatus('accepted');
      return;
    }

    // Query friendships table for pending status
    async function checkPending() {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, user_id, friend_id, status')
        .or(
          `and(user_id.eq.${user!.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user!.id})`
        )
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setStatus('none');
        return;
      }

      setFriendshipId(data.id);

      if (data.status === 'accepted') {
        setStatus('accepted');
      } else if (data.user_id === user!.id) {
        setStatus('pending_sent');
      } else {
        setStatus('pending_received');
      }
    }

    checkPending();
  }, [targetUserId, user, friends]);

  const sendRequest = useCallback(async () => {
    if (!targetUserId) return;
    setStatus('pending_sent');
    const result = await storeSendRequest(targetUserId);
    if (result.success) {
      if (result.autoAccepted) {
        setStatus('accepted');
        storeLoadFriends();
      }
    } else {
      setStatus('none');
    }
  }, [targetUserId, storeSendRequest, storeLoadFriends]);

  const acceptRequest = useCallback(async () => {
    if (!friendshipId) return;
    setStatus('accepted');
    const success = await storeAcceptRequest(friendshipId);
    if (!success) {
      setStatus('pending_received');
    }
  }, [friendshipId, storeAcceptRequest]);

  return { status, sendRequest, acceptRequest };
}
