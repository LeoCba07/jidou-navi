-- Fix: get_flagged_machines returns TEXT but table columns are varchar(200)
-- Postgres error 42804: "structure of query does not match function result type"
-- Solution: cast varchar columns to TEXT in the SELECT

CREATE OR REPLACE FUNCTION get_flagged_machines(
    limit_count INT DEFAULT 50,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    contributor_id UUID,
    contributor_username TEXT,
    contributor_display_name TEXT,
    primary_photo_url TEXT,
    gone_report_count BIGINT,
    created_at TIMESTAMPTZ,
    flagged_at TIMESTAMPTZ,
    flag_details TEXT
) AS $$
BEGIN
    -- Admin guard
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
        m.name::TEXT,
        m.description::TEXT,
        m.address::TEXT,
        m.latitude,
        m.longitude,
        m.contributor_id,
        p.username::TEXT AS contributor_username,
        p.display_name::TEXT AS contributor_display_name,
        (
            SELECT mp.photo_url
            FROM machine_photos mp
            WHERE mp.machine_id = m.id AND mp.is_primary = TRUE AND mp.status = 'active'
            LIMIT 1
        ) AS primary_photo_url,
        (
            SELECT COUNT(*)
            FROM machine_gone_reports mgr
            WHERE mgr.machine_id = m.id
        ) AS gone_report_count,
        m.created_at,
        (
            SELECT f.created_at
            FROM flags f
            WHERE f.machine_id = m.id AND f.reason = 'not_exists'
            ORDER BY f.created_at DESC
            LIMIT 1
        ) AS flagged_at,
        (
            SELECT f.details
            FROM flags f
            WHERE f.machine_id = m.id AND f.reason = 'not_exists'
            ORDER BY f.created_at DESC
            LIMIT 1
        ) AS flag_details
    FROM machines m
    LEFT JOIN profiles p ON p.id = m.contributor_id
    WHERE m.status = 'flagged'
      AND EXISTS (SELECT 1 FROM flags f WHERE f.machine_id = m.id AND f.reason = 'not_exists')
    ORDER BY m.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
