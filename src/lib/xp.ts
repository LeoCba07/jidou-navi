import { supabase } from './supabase';
import { Analytics } from './analytics';
import { useAuthStore } from '../store/authStore';

export const XP_VALUES = {
  CHECK_IN: 10,
  PHOTO_UPLOAD: 25,
  ADD_MACHINE: 50,
  VERIFY_MACHINE: 15,
};

/**
 * Adds XP to the current user, updates local state, and tracks the event.
 * @param amount The amount of XP to add (use XP_VALUES constants)
 * @param reason The reason for adding XP (for analytics)
 */
export async function addXP(amount: number, reason: string) {
  try {
    // Call RPC which now returns the new values
    const { data, error } = await supabase.rpc('increment_xp', { xp_to_add: amount });

    if (error) {
      console.error('[XP] Error incrementing XP:', error);
      return { success: false, error };
    }

    // Update local store if we got data back
    // The RPC returns an array of objects (even though it's single row)
    const { profile, setProfile } = useAuthStore.getState();
    
    if (data && Array.isArray(data) && data.length > 0) {
      const { new_xp, new_level } = data[0];
      
      if (profile) {
        setProfile({
          ...profile,
          xp: new_xp,
          level: new_level,
        });
      }
    } else if (data && !Array.isArray(data)) {
      // Handle case where it might return a single object
      const result = data as any;
      const { new_xp, new_level } = result;
      if (profile) {
        setProfile({
          ...profile,
          xp: new_xp,
          level: new_level,
        });
      }
    }

    // Track analytics for XP gain
    Analytics.track('xp_gain', {
      amount,
      reason,
    });

    return { success: true, data };
  } catch (err) {
    console.error('[XP] Unexpected error:', err);
    return { success: false, error: err };
  }
}

/**
 * Optimistically updates the local profile XP and level.
 * Use this when the backend XP update happens via a separate RPC (like upvotes).
 * @param amount XP amount to add (can be negative)
 */
export function updateLocalXP(amount: number) {
  const { profile, setProfile } = useAuthStore.getState();
  if (!profile) return;
  
  const newXP = Math.max(0, (profile.xp || 0) + amount);
  // Recalculate level locally
  const newLevel = Math.floor(0.1 * Math.sqrt(newXP)) + 1;
  
  setProfile({
    ...profile,
    xp: newXP,
    level: newLevel
  });
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
