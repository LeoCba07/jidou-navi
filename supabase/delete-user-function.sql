-- Function to delete user account and all related data
-- Run this in Supabase SQL Editor to enable delete account feature

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete will cascade to:
  -- - saved_machines (ON DELETE CASCADE)
  -- - visits (ON DELETE CASCADE via profile FK)
  -- - user_badges (ON DELETE CASCADE via profile FK)
  -- - machines contributor_id will be SET NULL
  -- - machine_photos uploaded_by will be SET NULL

  -- Delete the profile (which will cascade delete related records)
  DELETE FROM profiles WHERE id = current_user_id;

  -- Delete the auth user
  -- Note: This requires service_role key in production
  -- For now, we'll just delete the profile and the user can contact support
  -- to fully delete their auth account

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- Note: To fully delete auth.users, you need to:
-- 1. Use Supabase Dashboard > Authentication > Users > Delete User
-- 2. Or create a Supabase Edge Function with service_role key
-- 3. Or have users contact support at jidou.navi@gmail.com
