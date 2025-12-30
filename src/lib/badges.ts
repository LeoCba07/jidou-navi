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
  const newlyEarned: NewlyEarnedBadge[] = [];

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
    });

    if (isEarned) {
      // Award the badge
      const { error: insertError } = await supabase
        .from('user_badges')
        .insert({
          user_id: user.id,
          badge_id: badge.id,
          trigger_machine_id: machineId || null,
        });

      if (insertError) {
        // Might be duplicate, skip
        if (insertError.code !== '23505') {
          console.error('Error awarding badge:', insertError);
        }
        continue;
      }

      newlyEarned.push({
        ...typedBadge,
        unlocked_at: new Date().toISOString(),
      });
    }
  }

  return newlyEarned;
}

// Check if user meets badge requirements based on trigger type
function checkBadgeEligibility(
  badge: Badge,
  profile: { visit_count: number; contribution_count: number }
): boolean {
  const trigger = badge.trigger_value;
  if (!trigger) return false;

  switch (badge.trigger_type) {
    case 'visit_count':
      return profile.visit_count >= (trigger.count || 0);

    case 'contribution_count':
      return profile.contribution_count >= (trigger.count || 0);

    case 'category_visit':
      // TODO: Implement category-specific visit tracking
      // This requires tracking visits per category, which isn't in the current profile
      // For now, skip these badges
      return false;

    case 'verification_count':
      // TODO: Implement verification count tracking
      // This requires tracking how many times user verified machines exist
      return false;

    default:
      return false;
  }
}
