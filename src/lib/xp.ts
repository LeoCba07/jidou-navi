import { supabase } from './supabase';
import { Analytics } from './analytics';

export const XP_VALUES = {
  CHECK_IN: 10,
  PHOTO_UPLOAD: 25,
  ADD_MACHINE: 50,
  VERIFY_MACHINE: 15,
};

/**
 * Adds XP to the current user and tracks the event in analytics.
 * @param amount The amount of XP to add (use XP_VALUES constants)
 * @param reason The reason for adding XP (for analytics)
 */
export async function addXP(amount: number, reason: string) {
  try {
    const { error } = await supabase.rpc('increment_xp', { xp_to_add: amount });

    if (error) {
      console.error('[XP] Error incrementing XP:', error);
      return { success: false, error };
    }

    // Track analytics for XP gain
    Analytics.track('xp_gain' as any, {
      amount,
      reason,
    });

    return { success: true };
  } catch (err) {
    console.error('[XP] Unexpected error:', err);
    return { success: false, error: err };
  }
}

/**
 * Calculates the XP required for a specific level.
 * Formula: XP = ((Level - 1) / 0.1)^2
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.pow((level - 1) / 0.1, 2);
}

/**
 * Calculates progress towards the next level.
 * @returns percentage (0-100) and current/next XP requirements
 */
export function getLevelProgress(currentXP: number) {
  const currentLevel = Math.floor(0.1 * Math.sqrt(currentXP)) + 1;
  const xpForCurrentLevel = getXPForLevel(currentLevel);
  const xpForNextLevel = getXPForLevel(currentLevel + 1);
  
  const progressInLevel = currentXP - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  
  const percentage = Math.min(100, Math.max(0, (progressInLevel / xpNeededForLevel) * 100));
  
  return {
    currentLevel,
    nextLevel: currentLevel + 1,
    currentXP,
    xpForNextLevel,
    percentage,
  };
}
