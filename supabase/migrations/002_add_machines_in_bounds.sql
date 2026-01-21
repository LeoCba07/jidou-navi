-- Add machines_in_bounds function for map viewport queries
CREATE OR REPLACE FUNCTION machines_in_bounds(
    min_lat DOUBLE PRECISION,
    max_lat DOUBLE PRECISION,
    min_lng DOUBLE PRECISION,
    max_lng DOUBLE PRECISION,
    limit_count INTEGER DEFAULT 200
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    status machine_status,
    visit_count INTEGER,
    primary_photo_url TEXT,
    categories JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.name,
        m.description,
        m.address,
        m.latitude,
        m.longitude,
        0::DOUBLE PRECISION as distance_meters,
        m.status,
        m.visit_count,
        mp.photo_url as primary_photo_url,
        COALESCE(
            (SELECT json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'color', c.color))
            FROM machine_categories mc
            JOIN categories c ON c.id = mc.category_id
            WHERE mc.machine_id = m.id),
            '[]'::json
        ) as categories
    FROM machines m
    LEFT JOIN machine_photos mp ON mp.machine_id = m.id AND mp.is_primary = TRUE AND mp.status = 'active'
    WHERE m.status = 'active'
        AND m.latitude >= min_lat
        AND m.latitude <= max_lat
        AND m.longitude >= min_lng
        AND m.longitude <= max_lng
    ORDER BY m.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
