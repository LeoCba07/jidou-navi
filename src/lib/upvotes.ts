// Upvote system functions for machines
import { supabase } from './supabase';

export const MAX_DAILY_UPVOTES = 3;
export const XP_PER_UPVOTE = 5;

export type UpvoteResult = {
  success: boolean;
  error?: string;
  xp_awarded?: number;
  remaining_votes?: number;
};

export type RemoveUpvoteResult = {
  success: boolean;
  error?: string;
  remaining_votes?: number;
};

// Get user's daily upvote count
export async function getDailyUpvoteCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_user_daily_upvote_count');

  if (error) {
    console.error('Error fetching daily upvote count:', error);
    return 0;
  }

  return data || 0;
}

// Check if user has upvoted a specific machine
export async function hasUpvotedMachine(machineId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_upvoted_machine', {
    p_machine_id: machineId,
  });

  if (error) {
    console.error('Error checking upvote status:', error);
    return false;
  }

  return data || false;
}

// Upvote a machine
export async function upvoteMachine(machineId: string): Promise<UpvoteResult> {
  const { data, error } = await supabase.rpc('upvote_machine', {
    p_machine_id: machineId,
  });

  if (error) {
    console.error('Error upvoting machine:', error);
    return { success: false, error: 'network_error' };
  }

  const result = data as UpvoteResult;
  return result;
}

// Remove upvote from a machine
export async function removeUpvote(machineId: string): Promise<RemoveUpvoteResult> {
  const { data, error } = await supabase.rpc('remove_upvote', {
    p_machine_id: machineId,
  });

  if (error) {
    console.error('Error removing upvote:', error);
    return { success: false, error: 'network_error' };
  }

  const result = data as RemoveUpvoteResult;
  return result;
}

// Get upvote count for a machine
export async function getMachineUpvoteCount(machineId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_machine_upvote_count', {
    p_machine_id: machineId,
  });

  if (error) {
    console.error('Error fetching machine upvote count:', error);
    return 0;
  }

  return data || 0;
}

// Get all machine IDs the user has upvoted
export async function getUserUpvotedMachineIds(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_user_upvoted_machine_ids');

  if (error) {
    console.error('Error fetching upvoted machine IDs:', error);
    return [];
  }

  return data || [];
}

// Get remaining upvotes for the day
export async function getRemainingUpvotes(): Promise<number> {
  const used = await getDailyUpvoteCount();
  return Math.max(0, MAX_DAILY_UPVOTES - used);
}
