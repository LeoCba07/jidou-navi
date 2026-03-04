-- Fix PR #358 review comments:
-- 1. reject_machine: use auth.uid() for reviewed_by instead of trusting caller param
-- 2. update_profile: use check_username_available() for uniqueness (checks profiles + auth.users metadata)

-- 1. Fix reject_machine to use auth.uid() for reviewed_by
CREATE OR REPLACE FUNCTION reject_machine(
    machine_id UUID,
    reviewer_id UUID,
    reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contributor_id UUID;
    v_machine_name TEXT;
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Get machine info
    SELECT m.contributor_id, m.name INTO v_contributor_id, v_machine_name
    FROM machines m
    WHERE m.id = machine_id AND m.status = 'pending';

    -- Machine not found or not pending
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Update machine status (use auth.uid() instead of caller-provided reviewer_id)
    UPDATE machines
    SET
        status = 'rejected',
        reviewed_at = NOW(),
        reviewed_by = auth.uid(),
        rejection_reason = reason
    WHERE machines.id = machine_id;

    -- Create notification for contributor (skip if account was deleted)
    IF v_contributor_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            v_contributor_id,
            'machine_rejected',
            'Submission Not Approved',
            'Your submission "' || COALESCE(v_machine_name, 'Unnamed Machine') || '" was not approved. Reason: ' || reason,
            jsonb_build_object('machine_id', machine_id, 'machine_name', v_machine_name, 'reason', reason)
        );
    END IF;

    RETURN TRUE;
END;
$$;

-- 2. Fix update_profile to use check_username_available() for uniqueness
CREATE OR REPLACE FUNCTION update_profile(
    p_display_name TEXT DEFAULT NULL,
    p_receive_newsletter BOOLEAN DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_current_display_name TEXT;
    v_last_change TIMESTAMPTZ;
    v_days_remaining INT;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_authenticated');
    END IF;

    IF p_display_name IS NOT NULL THEN
        SELECT display_name, last_display_name_change
        INTO v_current_display_name, v_last_change
        FROM profiles
        WHERE id = v_user_id;

        IF p_display_name IS DISTINCT FROM v_current_display_name THEN
            -- Cooldown check
            IF v_last_change IS NOT NULL AND v_last_change > NOW() - INTERVAL '14 days' THEN
                v_days_remaining := CEIL(EXTRACT(EPOCH FROM (v_last_change + INTERVAL '14 days' - NOW())) / 86400);
                RETURN json_build_object(
                    'success', false,
                    'error', 'name_change_cooldown',
                    'days_remaining', v_days_remaining
                );
            END IF;

            -- Uniqueness check (uses check_username_available which checks both profiles and auth.users metadata)
            IF NOT check_username_available(p_display_name) THEN
                RETURN json_build_object('success', false, 'error', 'username_taken');
            END IF;

            -- Update both username and display_name together
            UPDATE profiles
            SET
                username = p_display_name,
                display_name = p_display_name,
                last_display_name_change = NOW(),
                receive_newsletter = COALESCE(p_receive_newsletter, receive_newsletter),
                updated_at = NOW()
            WHERE id = v_user_id;

            RETURN json_build_object('success', true);
        END IF;
    END IF;

    -- Update only non-name fields (or name unchanged)
    UPDATE profiles
    SET
        receive_newsletter = COALESCE(p_receive_newsletter, receive_newsletter),
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
