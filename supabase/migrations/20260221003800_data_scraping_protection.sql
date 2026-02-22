-- Migration: Data Scraping Protection (P0.5)
-- Issue #269: Protect machine data from bulk anonymous access

-- ============================================
-- 1. RESTRICT TABLE READS TO AUTHENTICATED USERS
-- ============================================

-- Machines table
DROP POLICY IF EXISTS "Machines are viewable by everyone" ON machines;
CREATE POLICY "Machines are viewable by authenticated users"
    ON machines FOR SELECT
    USING (auth.role() = 'authenticated');

-- Profiles table
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
    ON profiles FOR SELECT
    USING (auth.role() = 'authenticated');

-- Revoke anon access to the deep linking view
REVOKE SELECT ON machines_with_details FROM anon;
GRANT SELECT ON machines_with_details TO authenticated;

-- ============================================
-- 2. HARDEN RPC FUNCTIONS (Rate Limit + Limit Cap)
-- ================================

-- 2a. nearby_machines
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
DECLARE
    v_safe_limit INTEGER;
BEGIN
    -- Rate limit: 30 calls per 10 minutes
    PERFORM check_rate_limit('nearby_machines', 30, 10);

    -- Enforce hard cap on limit_count
    v_safe_limit := LEAST(limit_count, 50);

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
    LIMIT v_safe_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2b. machines_in_bounds
CREATE OR REPLACE FUNCTION machines_in_bounds(
    min_lat DOUBLE PRECISION,
    max_lat DOUBLE PRECISION,
    min_lng DOUBLE PRECISION,
    max_lng DOUBLE PRECISION,
    limit_count INTEGER DEFAULT 100
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
DECLARE
    v_safe_limit INTEGER;
BEGIN
    -- Rate limit: 30 calls per 10 minutes
    PERFORM check_rate_limit('machines_in_bounds', 30, 10);

    -- Enforce hard cap on limit_count
    v_safe_limit := LEAST(limit_count, 100);

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
    LIMIT v_safe_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2c. search_machines
CREATE OR REPLACE FUNCTION search_machines(
    search_term TEXT,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status machine_status,
    visit_count INTEGER,
    similarity_score REAL
) AS $$
DECLARE
    v_safe_limit INTEGER;
BEGIN
    -- Rate limit: 30 calls per 10 minutes
    PERFORM check_rate_limit('search_machines', 30, 10);

    -- Enforce hard cap on limit_count
    v_safe_limit := LEAST(limit_count, 20);

    RETURN QUERY
    SELECT
        m.id,
        m.name,
        m.description,
        m.address,
        m.latitude,
        m.longitude,
        m.status,
        m.visit_count,
        GREATEST(
            COALESCE(similarity(m.name, search_term), 0),
            COALESCE(similarity(m.description, search_term), 0)
        ) as similarity_score
    FROM machines m
    WHERE m.status = 'active'
        AND (
            m.name % search_term
            OR m.description % search_term
        )
    ORDER BY similarity_score DESC
    LIMIT v_safe_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execution to authenticated users only
REVOKE EXECUTE ON FUNCTION nearby_machines FROM anon, public;
REVOKE EXECUTE ON FUNCTION machines_in_bounds FROM anon, public;
REVOKE EXECUTE ON FUNCTION search_machines FROM anon, public;

GRANT EXECUTE ON FUNCTION nearby_machines TO authenticated;
GRANT EXECUTE ON FUNCTION machines_in_bounds TO authenticated;
GRANT EXECUTE ON FUNCTION search_machines TO authenticated;
