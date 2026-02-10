-- Migration: Add update_profile RPC
-- Purpose: Allow users to update their display name and bio securely

CREATE OR REPLACE FUNCTION update_profile(
    p_display_name TEXT DEFAULT NULL,
    p_bio TEXT DEFAULT NULL,
    p_receive_newsletter BOOLEAN DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_authenticated');
    END IF;

    -- Update the profile
    UPDATE profiles
    SET 
        display_name = COALESCE(p_display_name, display_name),
        bio = COALESCE(p_bio, bio),
        receive_newsletter = COALESCE(p_receive_newsletter, receive_newsletter),
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION update_profile(TEXT, TEXT, BOOLEAN) TO authenticated;
