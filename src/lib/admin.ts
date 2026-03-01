// Admin API functions for machine approval workflow
import { supabase } from './supabase';

export type CategoryInfo = {
  id: string;
  slug: string;
  name: string;
  color: string;
  icon_name: string | null;
};

/** Pixel cat assets keyed by category slug — shared source of truth for admin UI. */
export const CATEGORY_ICONS: Record<string, any> = {
  eats: require('../../assets/pixel-cat-eats.png'),
  gachapon: require('../../assets/pixel-cat-gachapon.png'),
  weird: require('../../assets/pixel-cat-weird.png'),
  retro: require('../../assets/pixel-cat-retro.png'),
  'local-gems': require('../../assets/pixel-cat-local-gems.png'),
};

export type PendingMachine = {
  id: string;
  name: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  status: string;
  contributor_id: string | null;
  contributor_username: string | null;
  contributor_display_name: string | null;
  contributor_avatar_url: string | null;
  primary_photo_url: string | null;
  created_at: string;
  nearby_count: number;
  directions_hint: string | null;
  categories: CategoryInfo[];
};

export type NearbyMachine = {
  id: string;
  name: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  status: string;
  distance_meters: number;
  name_similarity: number;
  primary_photo_url: string | null;
};

export type UserPendingMachine = {
  id: string;
  name: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  status: string;
  primary_photo_url: string | null;
  created_at: string;
  rejection_reason: string | null;
};

// Fetch pending machines for admin review
export async function fetchPendingMachines(
  limit: number = 50,
  offset: number = 0
): Promise<PendingMachine[]> {
  const { data, error } = await supabase.rpc('get_pending_machines', {
    limit_count: limit,
    offset_count: offset,
  });

  if (error) {
    console.error('Error fetching pending machines:', error);
    return [];
  }

  return (data || []) as PendingMachine[];
}

// Check for duplicate/nearby machines
export async function checkDuplicateMachines(
  machineId: string,
  radiusMeters: number = 50
): Promise<NearbyMachine[]> {
  const { data, error } = await (supabase as any).rpc('check_duplicate_machines', {
    p_machine_id: machineId,
    p_radius_meters: radiusMeters,
  });

  if (error) {
    console.error('Error checking duplicate machines:', error);
    return [];
  }

  return (data || []) as NearbyMachine[];
}

// Approve a pending machine
export async function approveMachine(
  machineId: string,
  reviewerId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('approve_machine', {
    machine_id: machineId,
    reviewer_id: reviewerId,
  });

  if (error) {
    console.error('Error approving machine:', error);
    return false;
  }

  return data === true;
}

// Reject a pending machine
export async function rejectMachine(
  machineId: string,
  reviewerId: string,
  reason: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('reject_machine', {
    machine_id: machineId,
    reviewer_id: reviewerId,
    reason: reason,
  });

  if (error) {
    console.error('Error rejecting machine:', error);
    return false;
  }

  return data === true;
}

// Fetch user's pending machines (for profile)
export async function fetchUserPendingMachines(
  userId?: string
): Promise<UserPendingMachine[]> {
  const { data, error } = await supabase.rpc('get_user_pending_machines', {
    target_user_id: userId,
  });

  if (error) {
    console.error('Error fetching user pending machines:', error);
    return [];
  }

  return (data || []) as UserPendingMachine[];
}

// Dismiss a rejected machine submission from user's profile view
export async function dismissRejectedMachine(
  machineId: string
): Promise<boolean> {
  const { data, error } = await (supabase as any).rpc('dismiss_rejected_machine', {
    p_machine_id: machineId,
  });

  if (error) {
    console.error('Error dismissing rejected machine:', error);
    return false;
  }

  return data === true;
}

// Remove an active photo from a machine (admin or owner action via RPC)
export async function removeActivePhoto(photoId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('remove_photo', {
    p_photo_id: photoId,
  });

  if (error) {
    console.error('Error removing photo:', error);
    return false;
  }

  return data === true;
}

export type BanUserResult = {
  banned: boolean;
  rejected_machines: number;
};

// Ban a user via SECURITY DEFINER RPC — admin role is verified server-side.
// Also rejects all their pending submissions (machines + photos).
// Untyped RPC escape hatch: `ban_user` is not in generated database.types
export async function banUser(userId: string): Promise<BanUserResult | null> {
  const { data, error } = await (supabase as any).rpc('ban_user', { p_user_id: userId });

  if (error) {
    console.error('Error banning user:', error);
    return null;
  }

  const result = typeof data === 'string' ? JSON.parse(data) : data;

  if (!result?.banned) {
    console.error('Error banning user: RPC returned banned=false (invalid userId or permission denied)', { userId });
    return null;
  }

  return result as BanUserResult;
}

// Unban a user via SECURITY DEFINER RPC — admin role is verified server-side
// Untyped RPC escape hatch: `unban_user` is not in generated database.types
export async function unbanUser(userId: string): Promise<boolean> {
  const { data, error } = await (supabase as any).rpc('unban_user', { p_user_id: userId });

  if (error) {
    console.error('Error unbanning user:', error);
    return false;
  }

  if (data !== true) {
    console.error('Error unbanning user: RPC returned false (invalid userId or permission denied)', { userId });
    return false;
  }

  return true;
}
