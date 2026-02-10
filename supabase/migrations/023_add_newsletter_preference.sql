-- Migration: Add newsletter preference to profiles
-- Purpose: Allow users to opt-in to newsletters during signup

-- 1. Add the column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS receive_newsletter BOOLEAN DEFAULT FALSE;

-- 2. Update the handle_new_user function to include newsletter preference
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
