-- Fix nearby_count in get_pending_machines to reuse check_duplicate_machines
-- instead of duplicating the filtering logic

DROP FUNCTION IF EXISTS get_pending_machines(INT, INT);

CREATE OR REPLACE FUNCTION get_pending_machines(
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
    status machine_status,
    contributor_id UUID,
    contributor_username TEXT,
    contributor_display_name TEXT,
    contributor_avatar_url TEXT,
    primary_photo_url TEXT,
    created_at TIMESTAMPTZ,
    nearby_count BIGINT,
    directions_hint TEXT,
    categories JSON
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
        m.name::TEXT,
        m.description,
        m.address,
        m.latitude,
        m.longitude,
        m.status,
        m.contributor_id,
        p.username::TEXT AS contributor_username,
        p.display_name::TEXT AS contributor_display_name,
        p.avatar_url::TEXT AS contributor_avatar_url,
        (
            SELECT mp.photo_url
            FROM machine_photos mp
            WHERE mp.machine_id = m.id
            AND mp.is_primary = true
            LIMIT 1
        ) AS primary_photo_url,
        m.created_at,
        (SELECT COUNT(*) FROM check_duplicate_machines(m.id, 50)) AS nearby_count,
        m.directions_hint::TEXT,
        COALESCE(
            (SELECT json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'color', c.color, 'icon_name', c.icon_name))
            FROM machine_categories mc
            JOIN categories c ON c.id = mc.category_id
            WHERE mc.machine_id = m.id),
            '[]'::json
        ) AS categories
    FROM machines m
    LEFT JOIN profiles p ON p.id = m.contributor_id
    WHERE m.status = 'pending'
    ORDER BY m.created_at ASC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pending_machines TO authenticated;
