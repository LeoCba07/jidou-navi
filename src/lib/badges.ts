// Badge unlock logic - checks and awards badges based on user stats
import { supabase } from './supabase';
import { Sentry } from './sentry';

export type Badge = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_url: string | null;
  trigger_type: string;
  trigger_value: { count?: number; category?: string } | null;
  rarity: string | null;
  points: number | null;
  display_order: number | null;
  created_at: string | null;
};

export type NewlyEarnedBadge = Badge & {
  unlocked_at: string;
};

// Fetch category visit counts for a user
async function getCategoryVisitCounts(
  userId: string
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('visits')
    .select(`
      machine_id,
      machines!inner (
        machine_categories!inner (
          categories!inner (
            slug
          )
        )
      )
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching category visits:', error);
    Sentry.captureException(error, { tags: { context: 'badges_category_visits' } });
    return {};
  }
  
  if (!data) {
    const message = 'Error fetching category visits: no data returned';
    console.error(message);
    Sentry.captureMessage?.(message, {
      level: 'error',
      tags: { context: 'badges_category_visits' },
    });
    return {};
  }

  // Count visits per category
  const counts: Record<string, number> = {};
  for (const visit of data) {
    const machines = visit.machines as {
      machine_categories: { categories: { slug: string } }[];
    };
    if (machines?.machine_categories) {
      for (const mc of machines.machine_categories) {
        const slug = mc.categories?.slug;
        if (slug) {
          counts[slug] = (counts[slug] || 0) + 1;
        }
      }
    }
  }
  return counts;
}

// Fetch verification count (visits where still_exists = true)
async function getVerificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('visits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('still_exists', true);

  if (error) {
    console.error('Error fetching verification count:', error);
    Sentry.captureException(error, { tags: { context: 'badges_verification_count' } });
    return 0;
  }
  return count || 0;
}

// Check if user earned any new badges and award them
// Returns array of newly earned badges (for showing popup)
export async function checkAndAwardBadges(
  machineId?: string
): Promise<NewlyEarnedBadge[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch user's profile stats
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('visit_count, contribution_count')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return [];
  }

  // Fetch category visit counts, verification count, and total machines count in parallel
  const [categoryVisitCounts, verificationCount, totalMachinesResult] = await Promise.all([
    getCategoryVisitCounts(user.id),
    getVerificationCount(user.id),
    supabase.from('machines').select('*', { count: 'exact', head: true }).eq('status', 'active')
  ]);

  const totalMachinesCount = totalMachinesResult.count || 0;

  // Fetch all badges
  const { data: allBadges, error: badgesError } = await supabase
    .from('badges')
    .select('*');

  if (badgesError || !allBadges) {
    return [];
  }

  // Fetch user's already earned badges
  const { data: earnedBadges, error: earnedError } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', user.id);

  if (earnedError) {
    return [];
  }

  const earnedBadgeIds = new Set(earnedBadges?.map((b) => b.badge_id) || []);

  // Check which badges user now qualifies for
  const qualifiedBadges: Badge[] = [];

  for (const badge of allBadges) {
    // Skip if already earned
    if (earnedBadgeIds.has(badge.id)) continue;

    // Cast to our Badge type (Supabase returns Json for trigger_value)
    const typedBadge: Badge = {
      ...badge,
      trigger_value: badge.trigger_value as Badge['trigger_value'],
    };

    const isEarned = checkBadgeEligibility(typedBadge, {
      visit_count: profile.visit_count ?? 0,
      contribution_count: profile.contribution_count ?? 0,
      category_visit_counts: categoryVisitCounts,
      verification_count: verificationCount,
      total_machines_count: totalMachinesCount,
    });

    if (isEarned) {
      qualifiedBadges.push(typedBadge);
    }
  }

  // No new badges to award
  if (qualifiedBadges.length === 0) {
    return [];
  }

  // Batch insert all newly earned badges
  const badgesToInsert = qualifiedBadges.map((badge) => ({
    user_id: user.id,
    badge_id: badge.id,
    trigger_machine_id: machineId || null,
  }));

  const { error: insertError } = await supabase
    .from('user_badges')
    .insert(badgesToInsert);

  if (insertError) {
    // Log error but don't fail completely - some badges might have been duplicates
    if (insertError.code !== '23505') {
      console.error('Error awarding badges:', insertError);
      Sentry.captureException(insertError, { tags: { context: 'badges_award_insert' } });
    }
    return [];
  }

  // Return newly earned badges
  const unlocked_at = new Date().toISOString();
  return qualifiedBadges.map((badge) => ({
    ...badge,
    unlocked_at,
  }));
}

// Check if user meets badge requirements based on trigger type
function checkBadgeEligibility(
  badge: Badge,
  stats: {
    visit_count: number;
    contribution_count: number;
    category_visit_counts: Record<string, number>;
    verification_count: number;
    total_machines_count: number;
  }
): boolean {
  const trigger = badge.trigger_value;
  if (!trigger && badge.trigger_type !== 'special') return false;

  switch (badge.trigger_type) {
    case 'visit_count':
      return stats.visit_count >= (trigger?.count || 0);

    case 'contribution_count':
      return stats.contribution_count >= (trigger?.count || 0);

    case 'category_visit': {
      const category = trigger?.category;
      if (!category) return false;
      const categoryCount = stats.category_visit_counts[category] || 0;
      return categoryCount >= (trigger?.count || 0);
    }

    case 'verification_count':
      return stats.verification_count >= (trigger?.count || 0);

    case 'special':
      if (badge.slug === 'epic_master') {
        // Award if user has visited every active machine
        // (Ensuring stats.visit_count represents unique visits)
        return stats.total_machines_count > 0 && stats.visit_count >= stats.total_machines_count;
      }
      return false;

    default:
      return false;
  }
}

// Badge opportunity for unlocking by visiting a machine
export type BadgeOpportunity = {
  badge: Badge;
  currentProgress: number;
  requiredProgress: number;
  progressPercent: number;
  willUnlockWithVisit: boolean;
  motivationalMessage: 'willUnlock' | 'visitMore';
  remaining: number;
};

// Get badges that user can progress toward or unlock by visiting a machine
export async function getUnlockableBadgesForMachine(
  machineCategories: string[]
): Promise<BadgeOpportunity[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Fetch user's profile stats
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('visit_count, contribution_count')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return [];
  }

  // Fetch category visit counts
  const categoryVisitCounts = await getCategoryVisitCounts(user.id);

  // Fetch all badges
  const { data: allBadges, error: badgesError } = await supabase
    .from('badges')
    .select('*');

  if (badgesError || !allBadges) {
    return [];
  }

  // Fetch user's already earned badges
  const { data: earnedBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', user.id);

  const earnedBadgeIds = new Set(earnedBadges?.map((b) => b.badge_id) || []);

  const opportunities: BadgeOpportunity[] = [];

  for (const badge of allBadges) {
    // Skip if already earned
    if (earnedBadgeIds.has(badge.id)) continue;

    const typedBadge: Badge = {
      ...badge,
      trigger_value: badge.trigger_value as Badge['trigger_value'],
    };

    const trigger = typedBadge.trigger_value;
    if (!trigger || !trigger.count) continue;

    let currentProgress = 0;
    let isRelevant = false;

    switch (typedBadge.trigger_type) {
      case 'visit_count':
        currentProgress = profile.visit_count ?? 0;
        isRelevant = true;
        break;

      case 'category_visit': {
        const category = trigger.category;
        if (category && machineCategories.includes(category)) {
          currentProgress = categoryVisitCounts[category] || 0;
          isRelevant = true;
        }
        break;
      }

      case 'verification_count':
        // Visiting also verifies if user confirms still exists
        const { count } = await supabase
          .from('visits')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('still_exists', true);
        currentProgress = count || 0;
        isRelevant = true;
        break;
    }

    if (!isRelevant) continue;

    const requiredProgress = trigger.count;
    const progressPercent = Math.min(100, (currentProgress / requiredProgress) * 100);
    const remaining = requiredProgress - currentProgress;
    const willUnlockWithVisit = remaining === 1;

    // Only show badges with >50% progress or will unlock
    if (progressPercent < 50 && !willUnlockWithVisit) continue;

    opportunities.push({
      badge: typedBadge,
      currentProgress,
      requiredProgress,
      progressPercent,
      willUnlockWithVisit,
      motivationalMessage: willUnlockWithVisit ? 'willUnlock' : 'visitMore',
      remaining,
    });
  }

  // Sort: badges that will unlock first, then by progress percent descending
  opportunities.sort((a, b) => {
    if (a.willUnlockWithVisit && !b.willUnlockWithVisit) return -1;
    if (!a.willUnlockWithVisit && b.willUnlockWithVisit) return 1;
    return b.progressPercent - a.progressPercent;
  });

  // Return max 3 badges
  return opportunities.slice(0, 3);
}

/**
 * Calculates current progress for a given badge based on user stats.
 */
export function calculateBadgeProgress(
  badge: Badge,
  userStats: { 
    visit_count: number; 
    contribution_count: number; 
    verification_count?: number;
    category_visit_counts?: Record<string, number>;
  }
): { current: number; required: number; percent: number } {
  const trigger = badge.trigger_value as Badge['trigger_value'];
  const required = trigger?.count || 0;
  let current = 0;

  switch (badge.trigger_type) {
    case 'visit_count':
      current = userStats.visit_count || 0;
      break;
    case 'contribution_count':
      current = userStats.contribution_count || 0;
      break;
    case 'verification_count':
      current = userStats.verification_count || 0;
      break;
    case 'category_visit':
      if (trigger?.category && userStats.category_visit_counts) {
        current = userStats.category_visit_counts[trigger.category] || 0;
      }
      break;
    default:
      current = 0;
  }

  const percent = required > 0 ? Math.min((current / required) * 100, 100) : 0;
  return { current, required, percent };
}
