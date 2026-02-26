import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { UserBadge } from '../components/profile/EarnedBadgeRow';
import type { Badge } from '../lib/badges';

interface UseUserBadgesOptions {
  userId: string | undefined;
  fetchAllBadges?: boolean;
}

export function useUserBadges({ userId, fetchAllBadges: shouldFetchAll = false }: UseUserBadgesOptions) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);
  const [loadingAllBadges, setLoadingAllBadges] = useState(shouldFetchAll);

  const fetchBadges = useCallback(async () => {
    if (!userId) {
      setLoadingBadges(false);
      return;
    }

    setLoadingBadges(true);
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        id,
        unlocked_at,
        badge:badges (
          id,
          slug,
          name,
          description,
          icon_url,
          rarity
        )
      `)
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (!error && data) {
      setBadges(data as unknown as UserBadge[]);
    }
    setLoadingBadges(false);
  }, [userId]);

  const fetchAll = useCallback(async () => {
    setLoadingAllBadges(true);
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setAllBadges(data as Badge[]);
    }
    setLoadingAllBadges(false);
  }, []);

  const refreshBadges = useCallback(async () => {
    await fetchBadges();
    if (shouldFetchAll) {
      await fetchAll();
    }
  }, [fetchBadges, fetchAll, shouldFetchAll]);

  return { badges, allBadges, loadingBadges, loadingAllBadges, refreshBadges, fetchBadges, fetchAllBadges: fetchAll };
}
