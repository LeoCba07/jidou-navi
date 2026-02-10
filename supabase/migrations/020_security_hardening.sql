-- Migration: Security hardening
-- Purpose: Fix auth bypasses, restrict visits visibility, add rate limiting

-- ============================================
-- 1. FIX remove_photo() AUTHORIZATION BYPASS
-- The old check "EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())"
-- is always true for any authenticated user, letting anyone delete any photo.
-- ============================================

CREATE OR REPLACE FUNCTION remove_photo(
    p_photo_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE machine_photos
    SET status = 'removed'
    WHERE id = p_photo_id
        AND (
            uploaded_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
            )
        );

    -- Update machine photo count
    IF FOUND THEN
        UPDATE machines m
        SET photo_count = (
            SELECT COUNT(*) FROM machine_photos mp
            WHERE mp.machine_id = m.id AND mp.status = 'active'
        )
        FROM machine_photos mp
        WHERE mp.id = p_photo_id AND m.id = mp.machine_id;
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. FIX clear_machine_gone_reports() MISSING AUTH
-- Was callable by any authenticated user with no role check.
-- ============================================

CREATE OR REPLACE FUNCTION clear_machine_gone_reports(p_machine_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Only admins can clear gone reports
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    DELETE FROM machine_gone_reports
    WHERE machine_id = p_machine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. RESTRICT VISITS TABLE TO AUTHENTICATED USERS
-- Was USING (true) which exposed user coordinates to anonymous requests.
-- ============================================

DROP POLICY IF EXISTS "Visits are viewable by everyone" ON visits;

CREATE POLICY "Visits are viewable by authenticated users"
    ON visits FOR SELECT
    USING (auth.role() = 'authenticated');

-- ============================================
-- 4. RATE LIMITING
-- Simple per-user rate limit tracking via a table + helper function.
-- Applied to write-heavy RPC functions to prevent abuse.
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user_action
    ON rate_limit_log (user_id, action, created_at DESC);

-- Auto-cleanup: delete entries older than 1 day to prevent table bloat
CREATE OR REPLACE FUNCTION cleanup_rate_limit_log()
RETURNS VOID AS $$
BEGIN
    DELETE FROM rate_limit_log WHERE created_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: check and record a rate-limited action
-- Returns TRUE if allowed, raises exception if rate limit exceeded.
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_action VARCHAR,
    p_max_calls INT,
    p_window_minutes INT
)
RETURNS BOOLEAN AS $$
DECLARE
    recent_count INT;
BEGIN
    SELECT COUNT(*) INTO recent_count
    FROM rate_limit_log
    WHERE user_id = auth.uid()
        AND action = p_action
        AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;

    IF recent_count >= p_max_calls THEN
        RAISE EXCEPTION 'Rate limit exceeded for %. Try again later.', p_action;
    END IF;

    INSERT INTO rate_limit_log (user_id, action)
    VALUES (auth.uid(), p_action);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS for rate_limit_log: no direct access, only through functions
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Apply rate limits to key functions by wrapping them:

-- 4a. Rate-limited create_visit: max 20 visits per 60 minutes
CREATE OR REPLACE FUNCTION create_visit(
    p_machine_id UUID,
    p_user_lat DOUBLE PRECISION,
    p_user_lng DOUBLE PRECISION,
    p_still_exists BOOLEAN DEFAULT NULL,
    p_max_distance_meters INTEGER DEFAULT 100
)
RETURNS visits AS $$
DECLARE
    v_distance DOUBLE PRECISION;
    v_visit visits;
BEGIN
    -- Rate limit: 20 visits per hour
    PERFORM check_rate_limit('create_visit', 20, 60);

    -- Calculate real distance server-side
    SELECT ST_Distance(
        location,
        ST_MakePoint(p_user_lng, p_user_lat)::geography
    ) INTO v_distance
    FROM machines WHERE id = p_machine_id;

    -- Reject if machine doesn't exist
    IF v_distance IS NULL THEN
        RAISE EXCEPTION 'Machine not found';
    END IF;

    -- Reject if too far
    IF v_distance > p_max_distance_meters THEN
        RAISE EXCEPTION 'Too far from machine to check in (% meters)', ROUND(v_distance::numeric, 1);
    END IF;

    -- Create the visit
    INSERT INTO visits (user_id, machine_id, checkin_location, distance_meters, still_exists)
    VALUES (
        auth.uid(),
        p_machine_id,
        ST_MakePoint(p_user_lng, p_user_lat)::geography,
        v_distance,
        p_still_exists
    )
    RETURNING * INTO v_visit;

    RETURN v_visit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4b. Rate-limited record_machine_gone_report: max 10 reports per 60 minutes
CREATE OR REPLACE FUNCTION record_machine_gone_report(p_machine_id UUID)
RETURNS JSON AS $$
DECLARE
    gone_count INT;
    flag_threshold INT := 2;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_authenticated');
    END IF;

    -- Rate limit: 10 gone reports per hour
    PERFORM check_rate_limit('record_gone_report', 10, 60);

    -- Insert gone report (will fail silently if already exists due to unique constraint)
    INSERT INTO machine_gone_reports (machine_id, user_id)
    VALUES (p_machine_id, auth.uid())
    ON CONFLICT (machine_id, user_id) DO NOTHING;

    -- Count unique gone reports for this machine
    SELECT COUNT(*) INTO gone_count
    FROM machine_gone_reports
    WHERE machine_id = p_machine_id;

    -- If threshold reached, create a flag for admin review
    IF gone_count >= flag_threshold THEN
        -- Check if flag already exists
        IF NOT EXISTS (
            SELECT 1 FROM flags
            WHERE machine_id = p_machine_id
            AND reason = 'not_exists'
            AND status = 'pending'
        ) THEN
            -- Create flag for admin review
            INSERT INTO flags (machine_id, reported_by, reason, details, status)
            VALUES (
                p_machine_id,
                auth.uid(),
                'not_exists',
                'Auto-flagged: ' || gone_count || ' users reported this machine as gone',
                'pending'
            );
        END IF;
    END IF;

    RETURN json_build_object(
        'success', true,
        'gone_reports', gone_count,
        'flagged', gone_count >= flag_threshold
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4c. Rate-limited remove_photo: max 10 removals per 60 minutes
-- (already recreated above with auth fix, now add rate limit)
CREATE OR REPLACE FUNCTION remove_photo(
    p_photo_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Rate limit: 10 photo removals per hour
    PERFORM check_rate_limit('remove_photo', 10, 60);

    UPDATE machine_photos
    SET status = 'removed'
    WHERE id = p_photo_id
        AND (
            uploaded_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
            )
        );

    -- Update machine photo count
    IF FOUND THEN
        UPDATE machines m
        SET photo_count = (
            SELECT COUNT(*) FROM machine_photos mp
            WHERE mp.machine_id = m.id AND mp.status = 'active'
        )
        FROM machine_photos mp
        WHERE mp.id = p_photo_id AND m.id = mp.machine_id;
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT EXECUTE ON FUNCTION check_rate_limit(VARCHAR, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_rate_limit_log() TO authenticated;
