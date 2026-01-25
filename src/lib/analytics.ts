import { supabase } from './supabase';
import { Database } from './database.types';

type EventName = 
  | 'app_open'
  | 'machine_view'
  | 'check_in'
  | 'photo_upload'
  | 'share_machine';

type EventProperties = Record<string, any>;

export const Analytics = {
  /**
   * Track a user interaction or event.
   * @param event The name of the event (e.g., 'machine_view')
   * @param properties Optional metadata associated with the event
   */
  track: async (event: EventName, properties: EventProperties = {}) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Option: Log anonymous events or skip
        console.log('[Analytics] Skipping event (no user):', event);
        return;
      }

      // Explicitly cast to unknown then to the expected insert type to avoid complex overload matching issues
      // or rely on the improved database.types.ts
      const { error } = await supabase
        .from('analytics_events')
        .insert({
          user_id: user.id,
          event_name: event,
          properties: properties,
        });

      if (error) {
        console.error('[Analytics] Error logging event:', error);
      } else {
        if (__DEV__) {
          console.log('[Analytics] Tracked:', event, properties);
        }
      }
    } catch (err) {
      console.error('[Analytics] Unexpected error:', err);
    }
  }
};

