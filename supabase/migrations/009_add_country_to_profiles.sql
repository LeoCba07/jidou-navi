-- Add country column to profiles table
-- Uses ISO 3166-1 alpha-2 codes (e.g., "JP", "US", "ES")
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS country CHAR(2);

-- Update the handle_new_user function to include country from user metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, username, display_name, avatar_url, country)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'username',
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'country'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
