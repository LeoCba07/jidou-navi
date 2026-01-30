// Notifications state - user in-app notifications
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;

  // Actions
  loadNotifications: () => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  reset: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  loadNotifications: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.rpc('get_user_notifications', {
        limit_count: 50,
        offset_count: 0,
      });

      if (error) {
        console.error('Error loading notifications:', error);
        set({ isLoading: false });
        return;
      }

      set({
        notifications: (data || []) as Notification[],
        isLoading: false,
      });
    } catch (err) {
      console.error('Error loading notifications:', err);
      set({ isLoading: false });
    }
  },

  loadUnreadCount: async () => {
    try {
      const { data, error } = await supabase.rpc('get_unread_notification_count');

      if (error) {
        console.error('Error loading unread count:', error);
        return;
      }

      set({ unreadCount: Number(data) || 0 });
    } catch (err) {
      console.error('Error loading unread count:', err);
    }
  },

  markAsRead: async (notificationIds: string[]) => {
    if (notificationIds.length === 0) return;

    try {
      const { error } = await supabase.rpc('mark_notifications_read', {
        notification_ids: notificationIds,
      });

      if (error) {
        console.error('Error marking notifications as read:', error);
        return;
      }

      // Update local state
      const { notifications } = get();
      const now = new Date().toISOString();
      set({
        notifications: notifications.map((n) =>
          notificationIds.includes(n.id) ? { ...n, read_at: now } : n
        ),
        unreadCount: Math.max(0, get().unreadCount - notificationIds.length),
      });
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  },

  markAllAsRead: async () => {
    const { notifications } = get();
    const unreadIds = notifications
      .filter((n) => n.read_at === null)
      .map((n) => n.id);

    if (unreadIds.length > 0) {
      await get().markAsRead(unreadIds);
    }
  },

  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
    });
  },
}));
