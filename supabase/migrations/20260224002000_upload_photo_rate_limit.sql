-- Migration: Photo upload rate limit (Issue #271 - P4 Cost Controls)
-- Description: Limit image uploads to 10 per hour for standard users.

CREATE OR REPLACE FUNCTION check_upload_limit()
RETURNS BOOLEAN AS $$
BEGIN
    -- Security: Ensure user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Rate limit: 10 photo uploads per 60 minutes
    -- Bypass for admins/devs
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'developer')
    ) THEN
        PERFORM check_rate_limit('upload_photo', 10, 60);
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke execute from anon/public
REVOKE EXECUTE ON FUNCTION check_upload_limit() FROM anon, public;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_upload_limit() TO authenticated;
