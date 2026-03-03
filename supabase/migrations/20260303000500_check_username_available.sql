-- RPC to check username availability across both profiles AND auth.users metadata.
-- Needed because a user may have signed up (username stored in auth.users.raw_user_meta_data)
-- but not yet logged in (so no profile row exists yet).

CREATE OR REPLACE FUNCTION check_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check profiles table
    IF EXISTS (SELECT 1 FROM profiles WHERE username = p_username) THEN
        RETURN FALSE;
    END IF;

    -- Check auth.users metadata (for users who signed up but haven't logged in yet)
    IF EXISTS (
        SELECT 1 FROM auth.users
        WHERE raw_user_meta_data->>'username' = p_username
    ) THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION check_username_available TO anon, authenticated;
