-- Migration: Machine submission rate limit (Issue #271)
-- Description: Implement RPC for machine submission with rate limiting to prevent spam.

CREATE OR REPLACE FUNCTION submit_machine(
    p_name VARCHAR,
    p_description TEXT,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_directions_hint TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID) AS $$
BEGIN
    -- Rate limit: 3 submissions per 24 hours (1440 minutes)
    -- Bypass for admins/devs to allow seeding
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        PERFORM check_rate_limit('submit_machine', 3, 1440);
    END IF;

    RETURN QUERY
    INSERT INTO machines (
        name,
        description,
        latitude,
        longitude,
        location,
        status,
        contributor_id,
        directions_hint
    )
    VALUES (
        p_name,
        p_description,
        p_latitude,
        p_longitude,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        'pending',
        auth.uid(),
        p_directions_hint
    )
    RETURNING machines.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke direct insert from anon/authenticated to force using the RPC (optional but safer)
-- For now, we grant execute to authenticated users.
GRANT EXECUTE ON FUNCTION submit_machine(VARCHAR, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO authenticated;
