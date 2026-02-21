-- Migration: Add newsletter preference to profiles
-- Purpose: Allow users to opt-in to newsletters during signup and manage preference in settings

-- 1. Add the column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS receive_newsletter BOOLEAN DEFAULT FALSE;

-- 2. Update the handle_new_user function to include newsletter preference (hardened)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, username, display_name, avatar_url, country, receive_newsletter)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'username',
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'country',
        COALESCE((NEW.raw_user_meta_data->>'receive_newsletter')::BOOLEAN, FALSE)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Replace update_profile RPC with new signature
-- First drop the old one to avoid overloading issues in PostgREST
DROP FUNCTION IF EXISTS update_profile(TEXT, TEXT);

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Re-grant permissions
GRANT EXECUTE ON FUNCTION update_profile(TEXT, TEXT, BOOLEAN) TO authenticated;