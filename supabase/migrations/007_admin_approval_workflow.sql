-- Migration: Admin approval workflow for machine submissions
-- Created at: 2026-01-30
-- Purpose: Add rejected status, notifications table, and admin RPC functions

-- 1. Add 'rejected' status to machine_status enum
ALTER TYPE machine_status ADD VALUE IF NOT EXISTS 'rejected';

-- 2. Add rejection_reason column to machines table
ALTER TABLE machines
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN machines.rejection_reason IS 'Reason for rejection, set when admin rejects a pending machine';

-- 3. Create notifications table for user notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

COMMENT ON TABLE notifications IS 'In-app notifications for users (approval/rejection notices, etc.)';

-- 4. RLS policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY notifications_select_own ON notifications
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY notifications_update_own ON notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Only service role can insert notifications (via RPC functions)
CREATE POLICY notifications_insert_service ON notifications
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- 5. Admin RLS policies for machines
-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS admin_view_all_machines ON machines;
CREATE POLICY admin_view_all_machines ON machines
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS admin_update_machines ON machines;
CREATE POLICY admin_update_machines ON machines
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- 6. Function to get pending machines for admin review
CREATE OR REPLACE FUNCTION get_pending_machines(
    limit_count INT DEFAULT 50,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address TEXT,
    status machine_status,
    contributor_id UUID,
    contributor_username TEXT,
    contributor_display_name TEXT,
    primary_photo_url TEXT,
    created_at TIMESTAMPTZ,
    nearby_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
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
        m.contributor_id,
        p.username AS contributor_username,
        p.display_name AS contributor_display_name,
        (
            SELECT mp.photo_url
            FROM machine_photos mp
            WHERE mp.machine_id = m.id
            AND mp.is_primary = true
            LIMIT 1
        ) AS primary_photo_url,
        m.created_at,
        (
            SELECT COUNT(*)
            FROM machines nearby
            WHERE nearby.id != m.id
            AND nearby.status = 'active'
            AND ST_DWithin(
                nearby.location::geography,
                m.location::geography,
                50  -- 50 meters radius
            )
        ) AS nearby_count
    FROM machines m
    LEFT JOIN profiles p ON p.id = m.contributor_id
    WHERE m.status = 'pending'
    ORDER BY m.created_at ASC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- 7. Function to check for duplicate/nearby machines
CREATE OR REPLACE FUNCTION check_duplicate_machines(
    machine_id UUID,
    radius_meters INT DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address TEXT,
    status machine_status,
    distance_meters DOUBLE PRECISION,
    primary_photo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target_location geography;
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Get target machine location
    SELECT m.location::geography INTO target_location
    FROM machines m
    WHERE m.id = machine_id;

    IF target_location IS NULL THEN
        RAISE EXCEPTION 'Machine not found';
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
        ST_Distance(m.location::geography, target_location) AS distance_meters,
        (
            SELECT mp.photo_url
            FROM machine_photos mp
            WHERE mp.machine_id = m.id
            AND mp.is_primary = true
            LIMIT 1
        ) AS primary_photo_url
    FROM machines m
    WHERE m.id != machine_id
    AND m.status = 'active'
    AND ST_DWithin(m.location::geography, target_location, radius_meters)
    ORDER BY distance_meters ASC;
END;
$$;

-- 8. Update approve_machine function to create notification
CREATE OR REPLACE FUNCTION approve_machine(
    machine_id UUID,
    reviewer_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contributor_id UUID;
    v_machine_name TEXT;
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Get machine info
    SELECT m.contributor_id, m.name INTO v_contributor_id, v_machine_name
    FROM machines m
    WHERE m.id = machine_id AND m.status = 'pending';

    IF v_contributor_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Update machine status
    UPDATE machines
    SET
        status = 'active',
        reviewed_at = NOW(),
        reviewed_by = reviewer_id
    WHERE machines.id = machine_id;

    -- Create notification for contributor
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        v_contributor_id,
        'machine_approved',
        'Machine Approved!',
        'Your submission "' || COALESCE(v_machine_name, 'Unnamed Machine') || '" has been approved and is now visible on the map.',
        jsonb_build_object('machine_id', machine_id, 'machine_name', v_machine_name)
    );

    RETURN TRUE;
END;
$$;

-- 9. Create reject_machine function
CREATE OR REPLACE FUNCTION reject_machine(
    machine_id UUID,
    reviewer_id UUID,
    reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contributor_id UUID;
    v_machine_name TEXT;
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Get machine info
    SELECT m.contributor_id, m.name INTO v_contributor_id, v_machine_name
    FROM machines m
    WHERE m.id = machine_id AND m.status = 'pending';

    IF v_contributor_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Update machine status
    UPDATE machines
    SET
        status = 'rejected',
        reviewed_at = NOW(),
        reviewed_by = reviewer_id,
        rejection_reason = reason
    WHERE machines.id = machine_id;

    -- Create notification for contributor
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        v_contributor_id,
        'machine_rejected',
        'Submission Not Approved',
        'Your submission "' || COALESCE(v_machine_name, 'Unnamed Machine') || '" was not approved. Reason: ' || reason,
        jsonb_build_object('machine_id', machine_id, 'machine_name', v_machine_name, 'reason', reason)
    );

    RETURN TRUE;
END;
$$;

-- 10. Function to get user's pending machines (for profile screen)
CREATE OR REPLACE FUNCTION get_user_pending_machines(
    target_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
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
    -- Use provided user_id or current user
    v_user_id := COALESCE(target_user_id, auth.uid());

    -- Users can only see their own pending machines (unless admin)
    IF v_user_id != auth.uid() AND NOT EXISTS (
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
    ORDER BY m.created_at DESC;
END;
$$;

-- 11. Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)
    FROM notifications
    WHERE user_id = auth.uid()
    AND read_at IS NULL;
$$;

-- 12. Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
    notification_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE notifications
    SET read_at = NOW()
    WHERE id = ANY(notification_ids)
    AND user_id = auth.uid()
    AND read_at IS NULL;

    RETURN TRUE;
END;
$$;

-- 13. Function to get user notifications
CREATE OR REPLACE FUNCTION get_user_notifications(
    limit_count INT DEFAULT 20,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    type VARCHAR(50),
    title TEXT,
    message TEXT,
    data JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        n.id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.read_at,
        n.created_at
    FROM notifications n
    WHERE n.user_id = auth.uid()
    ORDER BY n.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
$$;

-- 14. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_pending_machines TO authenticated;
GRANT EXECUTE ON FUNCTION check_duplicate_machines TO authenticated;
GRANT EXECUTE ON FUNCTION approve_machine TO authenticated;
GRANT EXECUTE ON FUNCTION reject_machine TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_pending_machines TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notifications TO authenticated;
