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
  -- Check if we are running as service_role (admin)
  IF auth.role() = 'service_role' THEN
      RETURN NEW;
  END IF;

  -- For INSERT: Only allow NULL or 'user'
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NOT NULL AND NEW.role != 'user' THEN
      RAISE EXCEPTION 'You are not allowed to set a privileged role on creation.';
    END IF;
    -- Force default role if not set or provided as 'user'
    NEW.role := COALESCE(NEW.role, 'user');
    RETURN NEW;
  END IF;

  -- For UPDATE: Prevent role changes
  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'You are not allowed to update the role field.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_role_update
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_role_update();
