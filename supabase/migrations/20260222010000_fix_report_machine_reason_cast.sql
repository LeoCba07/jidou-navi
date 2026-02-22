-- Fix: cast p_reason to flag_reason enum in report_machine()
-- The TEXT variable cannot be implicitly cast to the flag_reason enum type,
-- causing "column reason is of type flag_reason but expression is of type text".

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

    -- Check for existing report from same user on same machine (any status)
    IF EXISTS (
        SELECT 1 FROM flags
        WHERE machine_id = p_machine_id
        AND reported_by = auth.uid()
    ) THEN
        RETURN json_build_object('success', false, 'error', 'already_reported');
    END IF;

    -- Rate limit: max 5 reports per 60 minutes per user (uses shared rate limit helper)
    BEGIN
        PERFORM check_rate_limit('report_machine', 5, 60);
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', 'rate_limited');
    END;

    -- Insert the flag (explicit cast to flag_reason enum)
    INSERT INTO flags (machine_id, reported_by, reason, details, status)
    VALUES (p_machine_id, auth.uid(), p_reason::flag_reason, p_details, 'pending');

    RETURN json_build_object('success', true);
END;
$$;
