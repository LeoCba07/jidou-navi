-- Unify username and display_name: they should always be the same value.
-- When a user changes their name, both fields update together.
-- Username has a unique constraint, so this enforces no duplicates.

-- First sync any existing mismatches (display_name → username)
UPDATE profiles SET username = display_name
WHERE username IS DISTINCT FROM display_name;

-- Update the update_profile RPC to keep username and display_name in sync
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

            -- Uniqueness check
            IF EXISTS (
                SELECT 1 FROM profiles
                WHERE username = p_display_name
                AND id != v_user_id
            ) THEN
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
