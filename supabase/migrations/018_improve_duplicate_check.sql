-- Migration: Improve duplicate check logic
-- Purpose: Add name similarity scoring and refine radius to reduce false positives

-- 1. Drop existing function to allow changing return columns
DROP FUNCTION IF EXISTS check_duplicate_machines(UUID, INT);

-- 2. Re-create with name similarity
CREATE OR REPLACE FUNCTION check_duplicate_machines(
    p_machine_id UUID,
    p_radius_meters INT DEFAULT 50
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
    name_similarity REAL,
    primary_photo_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_location geography;
    v_target_name TEXT;
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Get target machine info
    SELECT m.location::geography, m.name INTO v_target_location, v_target_name
    FROM machines m
    WHERE m.id = p_machine_id;

    IF v_target_location IS NULL THEN
        RAISE EXCEPTION 'Machine not found';
    END IF;

    RETURN QUERY
    SELECT
        m.id,
        m.name::TEXT,
        m.description,
        m.latitude,
        m.longitude,
        m.address,
        m.status,
        ST_Distance(m.location::geography, v_target_location) AS distance_meters,
        similarity(COALESCE(m.name, ''), COALESCE(v_target_name, ''))::REAL as name_similarity,
        (
            SELECT mp.photo_url
            FROM machine_photos mp
            WHERE mp.machine_id = m.id
            AND mp.is_primary = true
            LIMIT 1
        ) AS primary_photo_url
    FROM machines m
    WHERE m.id != p_machine_id
    AND m.status = 'active'
    AND ST_DWithin(m.location::geography, v_target_location, p_radius_meters)
    ORDER BY name_similarity DESC, distance_meters ASC;
END;
$$;

-- 3. Regrant permissions
GRANT EXECUTE ON FUNCTION check_duplicate_machines TO authenticated;
