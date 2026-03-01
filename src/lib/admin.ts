// Admin API functions for machine approval workflow
import { supabase } from './supabase';

export type CategoryInfo = {
  id: string;
  slug: string;
  name: string;
  color: string;
  icon_name: string | null;
};

// Map DB icon_name values to valid Ionicons glyph names
const CATEGORY_ICON_MAP: Record<string, string> = {
  utensils: 'restaurant-outline',
  dice: 'dice-outline',
  ghost: 'skull-outline',
  gamepad: 'game-controller-outline',
  sparkles: 'sparkles-outline',
  cup: 'cafe-outline',
  restaurant: 'restaurant-outline',
  time: 'time-outline',
};

/** Resolve a DB icon_name to a valid Ionicons name, or null if unmapped. */
export function getCategoryIconName(iconName: string | null): string | null {
  if (!iconName) return null;
  return CATEGORY_ICON_MAP[iconName] ?? null;
}

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

export type PendingPhoto = {
  id: string;
  photo_url: string;
  machine_id: string;
  uploaded_by: string;
  created_at: string;
  machine_name: string | null;
  machine_address: string | null;
  uploader_username: string | null;
  uploader_display_name: string | null;
  uploader_avatar_url: string | null;
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

// Fetch pending photos for admin review
export async function fetchPendingPhotos(
  limit: number = 50
): Promise<PendingPhoto[]> {
  const { data, error } = await supabase
    .from('machine_photos')
    .select(`
      id,
      photo_url,
      machine_id,
      uploaded_by,
      created_at,
      machines!inner ( name, address ),
      profiles!inner ( username, display_name, avatar_url )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching pending photos:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    photo_url: row.photo_url,
    machine_id: row.machine_id,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
    machine_name: row.machines?.name ?? null,
    machine_address: row.machines?.address ?? null,
    uploader_username: row.profiles?.username ?? null,
    uploader_display_name: row.profiles?.display_name ?? null,
    uploader_avatar_url: row.profiles?.avatar_url ?? null,
  }));
}

// Approve a pending photo (set status to 'active')
export async function approvePhoto(photoId: string): Promise<boolean> {
  const { error } = await supabase
    .from('machine_photos')
    .update({ status: 'active' })
    .eq('id', photoId);

  if (error) {
    console.error('Error approving photo:', error);
    return false;
  }

  return true;
}

// Reject a pending photo (set status to 'removed')
export async function rejectPhoto(photoId: string): Promise<boolean> {
  const { error } = await supabase
    .from('machine_photos')
    .update({ status: 'removed' })
    .eq('id', photoId);

  if (error) {
    console.error('Error rejecting photo:', error);
    return false;
  }

  return true;
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
  rejected_photos: number;
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
