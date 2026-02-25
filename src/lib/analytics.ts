import { supabase } from './supabase';
import { Database } from './database.types';
import { Sentry } from './sentry';

type EventName = 
  | 'app_open'
  | 'machine_view'
  | 'machine_reported'
  | 'check_in'
  | 'photo_upload'
  | 'share_machine'
  | 'xp_gain';

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

      if (!user) return;

      const payload: Database['public']['Tables']['analytics_events']['Insert'] = {
        user_id: user.id,
        event_name: event,
        properties: properties,
      };

      const { error } = await supabase
        .from('analytics_events')
        .insert(payload);

      if (error) {
        Sentry.captureException(error, {
          tags: { context: 'analytics' },
          extra: { event, properties }
        });
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: { context: 'analytics' },
        extra: { event, properties }
      });
    }
  }
};

