-- Migration: Manual machine report/flag functionality
-- Issue #218: Add manual flag/report UI for machines

-- ============================================
-- 1. FUNCTION: Report a machine issue
-- ============================================
-- Allows users to manually report issues with machines
-- Validates authentication, prevents duplicates, rate limits

CREATE OR REPLACE FUNCTION report_machine(
    p_machine_id UUID,
    p_reason TEXT,
    p_details TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_valid_reasons TEXT[] := ARRAY['not_exists', 'duplicate', 'wrong_location', 'inappropriate', 'other'];
    v_recent_report_count INT;
    v_rate_limit INT := 5;
    v_rate_limit_hours INT := 1;
BEGIN
    -- Check authentication
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_authenticated');
    END IF;

    -- Validate reason
    IF NOT (p_reason = ANY(v_valid_reasons)) THEN
        RETURN json_build_object('success', false, 'error', 'invalid_reason');
    END IF;

    -- Require details for "other" reason
    IF p_reason = 'other' AND (p_details IS NULL OR TRIM(p_details) = '') THEN
        RETURN json_build_object('success', false, 'error', 'details_required');
    END IF;

    -- Check machine exists
    IF NOT EXISTS (SELECT 1 FROM machines WHERE id = p_machine_id) THEN
        RETURN json_build_object('success', false, 'error', 'machine_not_found');
    END IF;

    -- Check for existing pending report from same user on same machine
    IF EXISTS (
        SELECT 1 FROM flags
        WHERE machine_id = p_machine_id
        AND reported_by = auth.uid()
        AND status = 'pending'
    ) THEN
        RETURN json_build_object('success', false, 'error', 'already_reported');
    END IF;

    -- Rate limit: max 5 reports per hour per user
    SELECT COUNT(*) INTO v_recent_report_count
    FROM flags
    WHERE reported_by = auth.uid()
    AND created_at > NOW() - INTERVAL '1 hour' * v_rate_limit_hours;

    IF v_recent_report_count >= v_rate_limit THEN
        RETURN json_build_object('success', false, 'error', 'rate_limited');
    END IF;

    -- Insert the flag
    INSERT INTO flags (machine_id, reported_by, reason, details, status)
    VALUES (p_machine_id, auth.uid(), p_reason, p_details, 'pending');

    RETURN json_build_object('success', true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION report_machine TO authenticated;
