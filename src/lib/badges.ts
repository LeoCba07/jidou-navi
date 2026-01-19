// Badge unlock logic - checks and awards badges based on user stats
import { supabase } from './supabase';

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

  if (error || !data) {
    console.error('Error fetching category visits:', error);
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
    console.error('Error fetching profile for badge check:', profileError);
    return [];
  }

  // Fetch category visit counts and verification count in parallel
  const [categoryVisitCounts, verificationCount] = await Promise.all([
    getCategoryVisitCounts(user.id),
    getVerificationCount(user.id),
  ]);

  // Fetch all badges
  const { data: allBadges, error: badgesError } = await supabase
    .from('badges')
    .select('*');

  if (badgesError || !allBadges) {
    console.error('Error fetching badges:', badgesError);
    return [];
  }

  // Fetch user's already earned badges
  const { data: earnedBadges, error: earnedError } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', user.id);

  if (earnedError) {
    console.error('Error fetching earned badges:', earnedError);
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
  }
): boolean {
  const trigger = badge.trigger_value;
  if (!trigger) return false;

  switch (badge.trigger_type) {
    case 'visit_count':
      return stats.visit_count >= (trigger.count || 0);

    case 'contribution_count':
      return stats.contribution_count >= (trigger.count || 0);

    case 'category_visit': {
      const category = trigger.category;
      if (!category) return false;
      const categoryCount = stats.category_visit_counts[category] || 0;
      return categoryCount >= (trigger.count || 0);
    }

    case 'verification_count':
      return stats.verification_count >= (trigger.count || 0);

    default:
      return false;
  }
}
