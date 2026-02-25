-- One-time visits: remove revisiting, make visits permanent (one per user per machine)

-- 1. Clean up duplicate visits: keep only the earliest visit per (user_id, machine_id)
DELETE FROM visits
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, machine_id) id
    FROM visits
    ORDER BY user_id, machine_id, visited_at ASC
);

-- 2. Add UNIQUE constraint to prevent future duplicates
ALTER TABLE visits ADD CONSTRAINT visits_user_machine_unique UNIQUE (user_id, machine_id);

-- 3. Drop the cooldown trigger (no longer needed)
DROP TRIGGER IF EXISTS trigger_enforce_visit_cooldown ON visits;

-- 4. Drop the cooldown function (no longer needed)
DROP FUNCTION IF EXISTS enforce_visit_cooldown();

-- 5. Update create_visit to use ON CONFLICT instead of letting it fail
-- Preserves email verification and rate limiting from earlier migrations
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
    v_max_distance INTEGER;
BEGIN
    -- Email verification check
    PERFORM require_verified_email();

    -- Rate limit: 20 visits per hour
    PERFORM check_rate_limit('create_visit', 20, 60);

    -- Cap max distance to 200m to prevent client-side bypass
    v_max_distance := LEAST(COALESCE(p_max_distance_meters, 100), 200);

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
    IF v_distance > v_max_distance THEN
        RAISE EXCEPTION 'Too far from machine to check in (% meters)', ROUND(v_distance::numeric, 1);
    END IF;

    -- Create the visit (ON CONFLICT = already visited)
    INSERT INTO visits (user_id, machine_id, checkin_location, distance_meters, still_exists)
    VALUES (
        auth.uid(),
        p_machine_id,
        ST_MakePoint(p_user_lng, p_user_lat)::geography,
        v_distance,
        p_still_exists
    )
    ON CONFLICT (user_id, machine_id) DO NOTHING
    RETURNING * INTO v_visit;

    -- If no row was inserted, user already visited
    IF v_visit.id IS NULL THEN
        RAISE EXCEPTION 'already visited';
    END IF;

    RETURN v_visit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
