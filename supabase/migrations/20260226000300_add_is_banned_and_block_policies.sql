-- Add is_banned flag to profiles and enforce it via RLS and triggers.
-- Banned users are blocked from submitting machines, photos, and visits.

-- ============================================================
-- 1. Add is_banned column
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 2. RESTRICTIVE RLS policies — AND-ed with existing permissive ones.
--    A banned user fails this check regardless of what other
--    permissive policies allow (Postgres 15+ AS RESTRICTIVE).
-- ============================================================
CREATE POLICY "Block banned users from submitting machines"
ON machines FOR INSERT
AS RESTRICTIVE
TO authenticated
WITH CHECK (
    NOT COALESCE(
        (SELECT is_banned FROM profiles WHERE id = auth.uid()),
        FALSE
    )
);

CREATE POLICY "Block banned users from uploading photos"
ON machine_photos FOR INSERT
AS RESTRICTIVE
TO authenticated
WITH CHECK (
    NOT COALESCE(
        (SELECT is_banned FROM profiles WHERE id = auth.uid()),
        FALSE
    )
);

CREATE POLICY "Block banned users from creating visits"
ON visits FOR INSERT
AS RESTRICTIVE
TO authenticated
WITH CHECK (
    NOT COALESCE(
        (SELECT is_banned FROM profiles WHERE id = auth.uid()),
        FALSE
    )
);

-- ============================================================
-- 3. Trigger: prevent JWT-authenticated sessions from directly
--    changing is_banned. SECURITY DEFINER RPCs run as 'postgres'
--    and are therefore allowed through.
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_is_banned_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
        IF current_user NOT IN ('postgres', 'supabase_admin') THEN
            RAISE EXCEPTION 'Direct updates to is_banned are not permitted';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_is_banned_update ON profiles;
CREATE TRIGGER trg_prevent_is_banned_update
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_is_banned_update();

-- ============================================================
-- 4. SECURITY DEFINER RPCs for ban / unban.
--    Verify admin role server-side; bypass RLS safely.
-- ============================================================
CREATE OR REPLACE FUNCTION ban_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Admin privileges required';
    END IF;

    UPDATE profiles SET is_banned = TRUE WHERE id = p_user_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION ban_user(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION unban_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Admin privileges required';
    END IF;

    UPDATE profiles SET is_banned = FALSE WHERE id = p_user_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION unban_user(UUID) TO authenticated;

