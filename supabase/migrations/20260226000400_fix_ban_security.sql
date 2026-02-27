-- Fix ban security issues flagged in PR #339 review:
--
-- 1. The three permissive INSERT policies from 000300 do NOT block banned
--    users because Postgres OR-s permissive policies — a banned user who
--    satisfies any other INSERT policy is still allowed through.
--    Replace them with RESTRICTIVE policies (AND-ed with permissive ones).
--
-- 2. banUser/unbanUser updated profiles directly via client, but the only
--    existing UPDATE policy is "Users can update own profile".  Admins
--    therefore could not ban other users.  Replace with SECURITY DEFINER
--    RPCs (ban_user / unban_user) that verify admin role server-side.
--
-- 3. A banned user could flip their own is_banned back to false under the
--    "Users can update own profile" policy.  A BEFORE UPDATE trigger now
--    prevents direct is_banned changes from JWT-authenticated sessions;
--    only SECURITY DEFINER functions (running as postgres) may change it.

-- ============================================================
-- 1. Drop the broken permissive policies from migration 000300
-- ============================================================
DROP POLICY IF EXISTS "Banned users cannot submit machines"    ON machines;
DROP POLICY IF EXISTS "Banned users cannot upload photos"      ON machine_photos;
DROP POLICY IF EXISTS "Banned users cannot create visits"      ON visits;

-- ============================================================
-- 2. RESTRICTIVE policies — AND-ed with existing permissive ones
--    A banned user will fail this check regardless of what other
--    permissive policies allow.
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
--    changing is_banned.  SECURITY DEFINER RPCs run as 'postgres'
--    and are therefore allowed through.
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_is_banned_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
        -- current_user is 'postgres' inside SECURITY DEFINER functions,
        -- and 'authenticated'/'anon' for direct client requests.
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
-- 4. SECURITY DEFINER RPCs for ban / unban
--    These bypass RLS and verify admin role server-side,
--    so no client-facing UPDATE policy is needed.
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
