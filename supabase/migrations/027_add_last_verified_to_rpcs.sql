-- Add last_verified_at to nearby_machines and machines_in_bounds RPCs
-- This fixes the "Never verified" not updating after check-in (Issues #244, #246)
-- Must DROP first because CREATE OR REPLACE cannot change return type

-- ================================
-- NEARBY MACHINES WITH CURSOR PAGINATION
-- ================================
DROP FUNCTION IF EXISTS nearby_machines(double precision, double precision, integer, character varying, integer, double precision, uuid);

CREATE OR REPLACE FUNCTION nearby_machines(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 1000,
    category_slug VARCHAR DEFAULT NULL,
    limit_count INTEGER DEFAULT 50,
    cursor_distance DOUBLE PRECISION DEFAULT NULL,
    cursor_id UUID DEFAULT NULL
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
    verification_count INTEGER,
    primary_photo_url TEXT,
    categories JSON,
    directions_hint TEXT,
    last_verified_at TIMESTAMPTZ
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
        ST_Distance(m.location, ST_MakePoint(lng, lat)::geography) as distance_meters,
        m.status,
        m.visit_count,
        m.verification_count,
        mp.photo_url as primary_photo_url,
        COALESCE(
            (SELECT json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'color', c.color))
            FROM machine_categories mc
            JOIN categories c ON c.id = mc.category_id
            WHERE mc.machine_id = m.id),
            '[]'::json
        ) as categories,
        m.directions_hint,
        m.last_verified_at
    FROM machines m
    LEFT JOIN machine_photos mp ON mp.machine_id = m.id AND mp.is_primary = TRUE AND mp.status = 'active'
    LEFT JOIN machine_categories mc ON mc.machine_id = m.id
    LEFT JOIN categories c ON c.id = mc.category_id
    WHERE m.status = 'active'
        AND ST_DWithin(m.location, ST_MakePoint(lng, lat)::geography, radius_meters)
        AND (category_slug IS NULL OR c.slug = category_slug)
        -- Cursor-based pagination
        AND (
            cursor_distance IS NULL
            OR ST_Distance(m.location, ST_MakePoint(lng, lat)::geography) > cursor_distance
            OR (
                ST_Distance(m.location, ST_MakePoint(lng, lat)::geography) = cursor_distance
                AND m.id > cursor_id
            )
        )
    GROUP BY m.id, m.name, m.description, m.address, m.latitude, m.longitude, m.location, m.status, m.visit_count, mp.photo_url, m.directions_hint, m.last_verified_at
    ORDER BY ST_Distance(m.location, ST_MakePoint(lng, lat)::geography), m.id
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- MACHINES IN BOUNDS (for map viewport queries)
-- ================================
DROP FUNCTION IF EXISTS machines_in_bounds(double precision, double precision, double precision, double precision, integer);

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
    verification_count INTEGER,
    primary_photo_url TEXT,
    categories JSON,
    directions_hint TEXT,
    last_verified_at TIMESTAMPTZ
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
        m.verification_count,
        mp.photo_url as primary_photo_url,
        COALESCE(
            (SELECT json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'color', c.color))
            FROM machine_categories mc
            JOIN categories c ON c.id = mc.category_id
            WHERE mc.machine_id = m.id),
            '[]'::json
        ) as categories,
        m.directions_hint,
        m.last_verified_at
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
