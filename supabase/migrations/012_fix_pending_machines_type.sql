-- Fix: Cast return columns to TEXT to match RETURNS TABLE signature
-- This resolves the "structure of query does not match function result type" error (42804)

-- 1. Fix get_pending_machines
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
        m.name::TEXT, -- Cast to TEXT
        m.description,
        m.latitude,
        m.longitude,
        m.address,
        m.status,
        m.contributor_id,
        p.username::TEXT AS contributor_username, -- Cast to TEXT
        p.display_name::TEXT AS contributor_display_name, -- Cast to TEXT
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

-- 2. Fix check_duplicate_machines
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
        m.name::TEXT, -- Cast to TEXT
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

-- 3. Fix get_user_pending_machines
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
        m.name::TEXT, -- Cast to TEXT
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
