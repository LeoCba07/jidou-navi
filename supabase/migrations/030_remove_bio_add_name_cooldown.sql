-- Migration: Remove bio column and add display name change cooldown
-- Purpose: Remove the bio feature entirely and add a 14-day cooldown on display name changes

-- 1. Drop the public_profiles view first (it depends on bio column)
DROP VIEW IF EXISTS public_profiles;

-- 2. Drop bio column from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS bio;

-- 3. Add last_display_name_change column for cooldown tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_display_name_change TIMESTAMPTZ DEFAULT NULL;

-- 4. Recreate public_profiles view without bio
CREATE OR REPLACE VIEW public_profiles AS
SELECT
    id,
    username,
    display_name,
    avatar_url,
    xp,
    visit_count,
    contribution_count,
    badge_count,
    country,
    level,
    role,
    created_at
FROM profiles;

-- 5. Replace update_profile RPC with new signature (remove p_bio, add cooldown logic)
DROP FUNCTION IF EXISTS update_profile(TEXT, TEXT, BOOLEAN);

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
    -- Get current user ID
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_authenticated');
    END IF;

    -- If display name is being changed, check cooldown
    IF p_display_name IS NOT NULL THEN
        SELECT display_name, last_display_name_change
        INTO v_current_display_name, v_last_change
        FROM profiles
        WHERE id = v_user_id;

        -- Only enforce cooldown if the name is actually different
        IF p_display_name IS DISTINCT FROM v_current_display_name THEN
            IF v_last_change IS NOT NULL AND v_last_change > NOW() - INTERVAL '14 days' THEN
                v_days_remaining := CEIL(EXTRACT(EPOCH FROM (v_last_change + INTERVAL '14 days' - NOW())) / 86400);
                RETURN json_build_object(
                    'success', false,
                    'error', 'name_change_cooldown',
                    'days_remaining', v_days_remaining
                );
            END IF;

            -- Update display name and set cooldown timestamp
            UPDATE profiles
            SET
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

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION update_profile(TEXT, BOOLEAN) TO authenticated;
