-- Migration: Data Scraping Protection (P0.5) - REVISED with Copilot Improvements
-- Issue #269: Protect machine data from bulk anonymous access

-- ============================================
-- 1. RESTRICT TABLE READS TO AUTHENTICATED USERS
-- ============================================

-- Machines table: Drop existing public policies and replace with authenticated only
DROP POLICY IF EXISTS "Machines are viewable by everyone" ON machines;
DROP POLICY IF EXISTS "Active machines are viewable by everyone" ON machines;

CREATE POLICY "Active machines are viewable by authenticated users"
    ON machines FOR SELECT
    USING (auth.role() = 'authenticated' AND status = 'active');

-- Profiles table
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
    ON profiles FOR SELECT
    USING (auth.role() = 'authenticated');

-- Revoke anon access to the deep linking view
REVOKE SELECT ON machines_with_details FROM anon;
GRANT SELECT ON machines_with_details TO authenticated;

-- ============================================
-- 2. HARDEN RPC FUNCTIONS (Rate Limit + Limit Cap + Performance)
-- ================================

-- 2a. nearby_machines (Optimized with CTE)
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
DECLARE
    v_safe_limit INTEGER;
BEGIN
    -- Rate limit: 30 calls per 10 minutes
    PERFORM check_rate_limit('nearby_machines', 30, 10);

    -- Enforce hard cap with COALESCE/GREATEST to prevent NULL bypass (Copilot suggestion)
    v_safe_limit := GREATEST(1, LEAST(COALESCE(limit_count, 50), 50));

    RETURN QUERY
    WITH machine_base AS (
        SELECT
            m.id,
            m.name,
            m.description,
            m.address,
            m.latitude,
            m.longitude,
            m.location,
            m.status,
            m.visit_count,
            m.verification_count,
            m.directions_hint,
            m.last_verified_at,
            mp.photo_url AS primary_photo_url,
            ST_Distance(m.location, ST_MakePoint(lng, lat)::geography) AS computed_distance
        FROM machines m
        LEFT JOIN machine_photos mp ON mp.machine_id = m.id AND mp.is_primary = TRUE AND mp.status = 'active'
        WHERE m.status = 'active'
            AND ST_DWithin(m.location, ST_MakePoint(lng, lat)::geography, radius_meters)
            AND (
                category_slug IS NULL
                OR EXISTS (
                    SELECT 1 FROM machine_categories mc
                    JOIN categories c ON c.id = mc.category_id
                    WHERE mc.machine_id = m.id AND c.slug = category_slug
                )
            )
    )
    SELECT
        mb.id,
        mb.name,
        mb.description,
        mb.address,
        mb.latitude,
        mb.longitude,
        mb.computed_distance as distance_meters,
        mb.status,
        mb.visit_count,
        mb.verification_count,
        mb.primary_photo_url,
        COALESCE(
            (SELECT json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'color', c.color))
            FROM machine_categories mc
            JOIN categories c ON c.id = mc.category_id
            WHERE mc.machine_id = mb.id),
            '[]'::json
        ) as categories,
        mb.directions_hint,
        mb.last_verified_at
    FROM machine_base mb
    WHERE
        (cursor_distance IS NULL OR mb.computed_distance > cursor_distance OR (mb.computed_distance = cursor_distance AND mb.id > cursor_id))
    ORDER BY mb.computed_distance, mb.id
    LIMIT v_safe_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2b. machines_in_bounds
DROP FUNCTION IF EXISTS machines_in_bounds(double precision, double precision, double precision, double precision, integer);

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

    -- Enforce hard cap with COALESCE/GREATEST
    v_safe_limit := GREATEST(1, LEAST(COALESCE(limit_count, 100), 100));

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
DROP FUNCTION IF EXISTS search_machines(text, integer);

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

    -- Enforce hard cap with COALESCE/GREATEST
    v_safe_limit := GREATEST(1, LEAST(COALESCE(limit_count, 20), 20));

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

-- Revoke/Grant with full signatures (Copilot suggestion)
REVOKE EXECUTE ON FUNCTION nearby_machines(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, VARCHAR, INTEGER, DOUBLE PRECISION, UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION machines_in_bounds(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) FROM anon, public;
REVOKE EXECUTE ON FUNCTION search_machines(TEXT, INTEGER) FROM anon, public;

GRANT EXECUTE ON FUNCTION nearby_machines(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, VARCHAR, INTEGER, DOUBLE PRECISION, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION machines_in_bounds(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_machines(TEXT, INTEGER) TO authenticated;
