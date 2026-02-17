-- Fix: re-target analytics_events.user_id FK from profiles(id) to auth.users(id)
-- This prevents FK violations when Analytics.track() fires before the
-- handle_new_user() trigger has created the profile row.

ALTER TABLE public.analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_user_id_fkey;

-- Clean up any orphaned user_id values that do not exist in auth.users
UPDATE public.analytics_events AS ae
SET user_id = NULL
WHERE user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM auth.users AS u
    WHERE u.id = ae.user_id
  );

ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
  NOT VALID;

ALTER TABLE public.analytics_events
  VALIDATE CONSTRAINT analytics_events_user_id_fkey;
