-- Migration: Add role column to profiles table
-- Created at: 2026-01-21
-- Purpose: Enable developer/admin roles for override permissions

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Create an index for faster role lookups if needed later
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Comment
COMMENT ON COLUMN profiles.role IS 'User role: user, developer, admin';

-- Secure the role column: Prevent users from updating their own role
CREATE OR REPLACE FUNCTION prevent_role_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If the role is being changed
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow if it's a superuser/service role (using a simplified check or relying on session variables)
    -- In Supabase, usually we check auth.uid() vs the target row id in RLS.
    -- But here we want to block the *user* from changing it, even if RLS allows UPDATE on the row.
    -- A robust way is to check if the current user is 'postgres' or if a specific admin secret is present.
    -- For simplicity in this migration: Raises exception if a normal user tries to change it.
    -- NOTE: Ideally this logic should be in an RLS policy or separate admin function, 
    -- but a trigger works as a hard constraint.
    
    -- Check if we are running as service_role (admin) or if the role is not changing
    IF auth.role() = 'service_role' THEN
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'You are not allowed to update the role field.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_role_update
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_role_update();
