-- Migration: Add still_exists to get_machine_visitors RPC
-- This allows the frontend to distinguish "reported gone" visits from normal visits

DROP FUNCTION IF EXISTS get_machine_visitors(uuid, integer);

CREATE OR REPLACE FUNCTION get_machine_visitors(
    p_machine_id UUID,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    visited_at TIMESTAMPTZ,
    still_exists BOOLEAN
) AS $$
DECLARE
    v_safe_limit INTEGER;
BEGIN
    PERFORM check_rate_limit('get_visitors', 30, 10);
    v_safe_limit := GREATEST(1, LEAST(COALESCE(limit_count, 20), 20));

    RETURN QUERY
    SELECT
        p.id as user_id,
        p.username::TEXT,
        p.display_name::TEXT,
        p.avatar_url::TEXT,
        v.visited_at,
        v.still_exists
    FROM visits v
    JOIN profiles p ON p.id = v.user_id
    WHERE v.machine_id = p_machine_id
    ORDER BY v.visited_at DESC
    LIMIT v_safe_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_machine_visitors(UUID, INTEGER) FROM anon, public;
GRANT EXECUTE ON FUNCTION get_machine_visitors(UUID, INTEGER) TO authenticated;
