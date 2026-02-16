// Friends state - friend list, requests, and search
// Usage: const friends = useFriendsStore((state) => state.friends)
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Friend {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  friendship_id: string;
  friends_since: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  sent_at: string;
}

export interface UserSearchResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  friendship_status: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  friendship_id: string | null;
  is_sender: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  xp_this_week: number;
  is_current_user: boolean;
  country: string | null;
}

interface FriendsState {
  friends: Friend[];
  pendingRequests: FriendRequest[];
  pendingRequestCount: number;
  isLoading: boolean;
  searchResults: UserSearchResult[];
  isSearching: boolean;
  globalLeaderboard: LeaderboardEntry[];
  friendsLeaderboard: LeaderboardEntry[];
  isLoadingLeaderboard: boolean;

  // Actions
  loadFriends: () => Promise<void>;
  loadPendingRequests: () => Promise<void>;
  loadPendingRequestCount: () => Promise<void>;
  searchUsers: (term: string) => Promise<void>;
  clearSearchResults: () => void;
  sendRequest: (userId: string) => Promise<{ success: boolean; autoAccepted?: boolean; error?: string }>;
  acceptRequest: (requestId: string) => Promise<boolean>;
  declineRequest: (requestId: string) => Promise<boolean>;
  removeFriend: (friendId: string) => Promise<boolean>;
  loadGlobalLeaderboard: () => Promise<void>;
  loadFriendsLeaderboard: () => Promise<void>;
  reset: () => void;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  pendingRequests: [],
  pendingRequestCount: 0,
  isLoading: false,
  searchResults: [],
  isSearching: false,
  globalLeaderboard: [],
  friendsLeaderboard: [],
  isLoadingLeaderboard: false,

  loadFriends: async () => {
    set({ isLoading: true });
    try {
      // @ts-ignore - RPC function added in migration 011
      const { data, error } = await supabase.rpc('get_friends', { limit_count: 50, offset_count: 0 });
      if (error) throw error;
      set({ friends: (data as unknown as Friend[]) || [] });
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadPendingRequests: async () => {
    try {
      // @ts-ignore - RPC function added in migration 011
      const { data, error } = await supabase.rpc('get_pending_friend_requests');
      if (error) throw error;
      const requests = (data as FriendRequest[]) || [];
      set({ pendingRequests: requests, pendingRequestCount: requests.length });
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  },

  loadPendingRequestCount: async () => {
    try {
      // @ts-ignore - RPC function added in migration 011
      const { data, error } = await supabase.rpc('get_pending_friend_requests_count');
      if (error) throw error;
      set({ pendingRequestCount: (data as number) || 0 });
    } catch (error) {
      console.error('Error loading pending request count:', error);
    }
  },

  searchUsers: async (term: string) => {
    if (!term.trim()) {
      set({ searchResults: [] });
      return;
    }
    set({ isSearching: true });
    try {
      // @ts-ignore - RPC function added in migration 011
      const { data, error } = await supabase.rpc('search_users', {
        search_term: term.trim(),
        limit_count: 10,
      });

      if (error) {
        console.error('Error searching users:', error.message);
        set({ searchResults: [] });
        return;
      }

      set({ searchResults: (data as unknown as UserSearchResult[]) || [] });
    } catch (error) {
      console.error('Error searching users:', error);
      set({ searchResults: [] });
    } finally {
      set({ isSearching: false });
    }
  },

  clearSearchResults: () => set({ searchResults: [] }),

  sendRequest: async (userId: string) => {
    try {
      // @ts-ignore - RPC function added in migration 011
      const { data, error } = await supabase.rpc('send_friend_request', {
        target_user_id: userId,
      });

      if (error) {
        console.error('Supabase RPC error:', error);
        return { success: false, error: error.message || 'Failed to send request' };
      }

      const result = data as unknown as { success: boolean; auto_accepted?: boolean; error?: string };

      if (result.success) {
        // Update search results to reflect the new status
        const { searchResults } = get();
        set({
          searchResults: searchResults.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  friendship_status: result.auto_accepted ? 'accepted' : 'pending_sent',
                }
              : user
          ),
        });

        // If auto-accepted, reload friends
        if (result.auto_accepted) {
          get().loadFriends();
          get().loadPendingRequests();
        }
      }

      return {
        success: result.success,
        autoAccepted: result.auto_accepted,
        error: result.error,
      };
    } catch (error) {
      console.error('Error sending friend request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send request';
      return { success: false, error: errorMessage };
    }
  },

  acceptRequest: async (requestId: string) => {
    try {
      // @ts-ignore - RPC function added in migration 011
      const { data, error } = await supabase.rpc('accept_friend_request', {
        request_id: requestId,
      });
      if (error) throw error;

      const result = data as unknown as { success: boolean };
      if (result.success) {
        // Reload friends and pending requests
        get().loadFriends();
        get().loadPendingRequests();
      }
      return result.success;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return false;
    }
  },

  declineRequest: async (requestId: string) => {
    try {
      // @ts-ignore - RPC function added in migration 011
      const { data, error } = await supabase.rpc('decline_friend_request', {
        request_id: requestId,
      });
      if (error) throw error;

      const result = data as unknown as { success: boolean };
      if (result.success) {
        // Remove from pending requests
        const { pendingRequests } = get();
        set({
          pendingRequests: pendingRequests.filter((r) => r.id !== requestId),
          pendingRequestCount: Math.max(0, get().pendingRequestCount - 1),
        });
      }
      return result.success;
    } catch (error) {
      console.error('Error declining friend request:', error);
      return false;
    }
  },

  removeFriend: async (friendId: string) => {
    try {
      // @ts-ignore - RPC function added in migration 011
      const { data, error } = await supabase.rpc('remove_friend', {
        target_friend_id: friendId,
      });
      if (error) throw error;

      const result = data as unknown as { success: boolean };
      if (result.success) {
        // Remove from friends list
        const { friends } = get();
        set({
          friends: friends.filter((f) => f.id !== friendId),
        });
      }
      return result.success;
    } catch (error) {
      console.error('Error removing friend:', error);
      return false;
    }
  },

  loadGlobalLeaderboard: async () => {
    set({ isLoadingLeaderboard: true });
    try {
      // @ts-ignore - RPC function added in migration 011
      const { data, error } = await supabase.rpc('global_leaderboard', { limit_count: 10 });
      if (error) throw error;
      set({ globalLeaderboard: (data as unknown as LeaderboardEntry[]) || [] });
    } catch (error) {
      console.error('Error loading global leaderboard:', error);
    } finally {
      set({ isLoadingLeaderboard: false });
    }
  },

  loadFriendsLeaderboard: async () => {
    set({ isLoadingLeaderboard: true });
    try {
      // @ts-ignore - RPC function added in migration 011
      const { data, error } = await supabase.rpc('friends_leaderboard', { limit_count: 10 });
      if (error) throw error;
      set({ friendsLeaderboard: (data as unknown as LeaderboardEntry[]) || [] });
    } catch (error) {
      console.error('Error loading friends leaderboard:', error);
    } finally {
      set({ isLoadingLeaderboard: false });
    }
  },

  reset: () =>
    set({
      friends: [],
      pendingRequests: [],
      pendingRequestCount: 0,
      isLoading: false,
      searchResults: [],
      isSearching: false,
      globalLeaderboard: [],
      friendsLeaderboard: [],
      isLoadingLeaderboard: false,
    }),
}));
