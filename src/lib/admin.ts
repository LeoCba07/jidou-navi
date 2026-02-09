// Admin API functions for machine approval workflow
import { supabase } from './supabase';

export type CategoryInfo = {
  id: string;
  slug: string;
  name: string;
  color: string;
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
  // @ts-expect-error - DB function uses p_ prefix, generated types are out of sync
  const { data, error } = await supabase.rpc('check_duplicate_machines', {
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
