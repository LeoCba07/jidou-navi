-- Migration: Add role column to profiles table
-- Created at: 2026-01-21
-- Purpose: Enable developer/admin roles for override permissions

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Create an index for faster role lookups if needed later
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Comment
COMMENT ON COLUMN profiles.role IS 'User role: user, developer, admin';
