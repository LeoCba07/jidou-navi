-- Migration: Allow users to dismiss rejected machine submissions
-- Created at: 2026-02-10
-- Purpose: Add dismissed_at column and RPC function for dismissing rejected submissions

-- 1. Add dismissed_at column to machines table
ALTER TABLE machines
ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;

COMMENT ON COLUMN machines.dismissed_at IS 'Timestamp when user dismissed a rejected submission from their profile view';

-- 2. Update get_user_pending_machines to exclude dismissed machines
DROP FUNCTION IF EXISTS get_user_pending_machines(uuid);

CREATE OR REPLACE FUNCTION get_user_pending_machines(
    target_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(200),
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address TEXT,
    status machine_status,
    primary_photo_url TEXT,
    created_at TIMESTAMPTZ,
    rejection_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Use provided user_id or current user
    v_user_id := COALESCE(target_user_id, auth.uid());

    -- Users can only see their own pending machines (unless admin)
    IF v_user_id IS DISTINCT FROM auth.uid() AND NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT
        m.id,
        m.name,
        m.description,
        m.latitude,
        m.longitude,
        m.address,
        m.status,
        (
            SELECT mp.photo_url
            FROM machine_photos mp
            WHERE mp.machine_id = m.id
            AND mp.is_primary = true
            LIMIT 1
        ) AS primary_photo_url,
        m.created_at,
        m.rejection_reason
    FROM machines m
    WHERE m.contributor_id = v_user_id
    AND m.status IN ('pending', 'rejected')
    AND m.dismissed_at IS NULL  -- Exclude dismissed submissions
    ORDER BY m.created_at DESC;
END;
$$;

-- 3. Create function to dismiss a rejected submission
CREATE OR REPLACE FUNCTION dismiss_rejected_machine(
    p_machine_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_machine_status machine_status;
    v_contributor_id UUID;
BEGIN
    -- Check authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    -- Get machine info
    SELECT m.status, m.contributor_id INTO v_machine_status, v_contributor_id
    FROM machines m
    WHERE m.id = p_machine_id;

    -- Check machine exists
    IF v_contributor_id IS NULL THEN
        RAISE EXCEPTION 'Machine not found';
    END IF;

    -- Check user owns this submission
    IF v_contributor_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Access denied: You can only dismiss your own submissions';
    END IF;

    -- Check machine is rejected (can't dismiss pending)
    IF v_machine_status != 'rejected' THEN
        RAISE EXCEPTION 'Only rejected submissions can be dismissed';
    END IF;

    -- Mark as dismissed
    UPDATE machines
    SET dismissed_at = NOW()
    WHERE id = p_machine_id;

    RETURN TRUE;
END;
$$;

-- 4. Grant execute permission
GRANT EXECUTE ON FUNCTION dismiss_rejected_machine TO authenticated;
