-- Fix: re-target analytics_events.user_id FK from profiles(id) to auth.users(id)
-- This prevents FK violations when Analytics.track() fires before the
-- handle_new_user() trigger has created the profile row.

ALTER TABLE public.analytics_events
  DROP CONSTRAINT analytics_events_user_id_fkey;

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
