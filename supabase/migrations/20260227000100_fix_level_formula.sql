-- Fix level formula inconsistency (issue #340)
--
-- Root cause: upvote_machine() used GREATEST(1, FLOOR(SQRT(xp/10))) to
-- calculate level, while every other XP path uses FLOOR(0.1*SQRT(xp))+1.
-- These are mathematically different — at xp=400 the wrong formula gives
-- level 6 instead of the correct level 3.
--
-- Fix strategy:
--   1. Rewrite upvote_machine() with the correct formula.
--   2. Add a BEFORE UPDATE trigger on profiles so that any future XP change
--      from any code path automatically recalculates level — prevents drift.
--   3. One-time backfill: recalculate level for all existing users.
--   4. Rewrite global_leaderboard / friends_leaderboard to derive level from
--      xp at query time rather than reading the potentially-stale column
--      (defense-in-depth).

-- ============================================================
-- 1. Fix upvote_machine() — correct level formula
-- ============================================================
CREATE OR REPLACE FUNCTION upvote_machine(p_machine_id UUID)
RETURNS JSON AS $$
DECLARE
    daily_count INT;
    max_daily_upvotes INT := 3;
    xp_per_upvote INT := 5;
BEGIN
    PERFORM require_verified_email();

    IF EXISTS (
        SELECT 1 FROM machine_upvotes
        WHERE user_id = auth.uid() AND machine_id = p_machine_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'already_upvoted');
    END IF;

    SELECT COUNT(*)::INT INTO daily_count
    FROM machine_upvotes
    WHERE user_id = auth.uid()
      AND created_at >= date_trunc('day', NOW());

    IF daily_count >= max_daily_upvotes THEN
        RETURN json_build_object('success', false, 'error', 'daily_limit_reached');
    END IF;

    INSERT INTO machine_upvotes (user_id, machine_id)
    VALUES (auth.uid(), p_machine_id);

    -- Use the canonical level formula: FLOOR(0.1 * SQRT(xp)) + 1
    UPDATE profiles AS p
    SET
        xp    = sub.new_xp,
        level = (FLOOR(0.1 * SQRT(sub.new_xp)) + 1)::INT
    FROM (
        SELECT id, COALESCE(xp, 0) + xp_per_upvote AS new_xp
        FROM profiles
        WHERE id = auth.uid()
    ) AS sub
    WHERE p.id = sub.id;

    RETURN json_build_object(
        'success', true,
        'xp_awarded', xp_per_upvote,
        'remaining_votes', max_daily_upvotes - daily_count - 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. Trigger: auto-recalculate level on any XP change
--    This makes all future XP paths self-correcting.
-- ============================================================
CREATE OR REPLACE FUNCTION sync_level_from_xp()
RETURNS TRIGGER AS $$
BEGIN
    -- Only recalculate when xp actually changed
    IF NEW.xp IS DISTINCT FROM OLD.xp THEN
        NEW.level := (FLOOR(0.1 * SQRT(COALESCE(NEW.xp, 0))) + 1)::INT;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_level_from_xp ON profiles;
CREATE TRIGGER trigger_sync_level_from_xp
    BEFORE UPDATE OF xp ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_level_from_xp();

-- ============================================================
-- 3. Backfill: correct all existing users' levels
-- ============================================================
UPDATE profiles
SET level = (FLOOR(0.1 * SQRT(COALESCE(xp, 0))) + 1)::INT
WHERE level IS DISTINCT FROM (FLOOR(0.1 * SQRT(COALESCE(xp, 0))) + 1)::INT
   OR level IS NULL;

-- ============================================================
-- 4. Rewrite leaderboard RPCs to compute level from xp
--    Removes dependency on the stored level column.
-- ============================================================
DROP FUNCTION IF EXISTS global_leaderboard(INT);
DROP FUNCTION IF EXISTS friends_leaderboard(INT);

CREATE FUNCTION global_leaderboard(limit_count INT DEFAULT 5)
RETURNS TABLE (
    rank           BIGINT,
    user_id        UUID,
    username       TEXT,
    display_name   TEXT,
    avatar_url     TEXT,
    level          INT,
    xp             INT,
    xp_this_week   INT,
    is_current_user BOOLEAN,
    country        TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH weekly_xp AS (
        SELECT
            v.user_id,
            COUNT(*)::INT * 25 AS week_xp
        FROM visits v
        WHERE v.visited_at >= date_trunc('week', NOW())
        GROUP BY v.user_id
    ),
    ranked AS (
        SELECT
            ROW_NUMBER() OVER (ORDER BY COALESCE(p.xp, 0) DESC, p.created_at ASC) AS rank,
            p.id                                                                    AS user_id,
            p.username::TEXT,
            p.display_name::TEXT,
            p.avatar_url::TEXT,
            -- Compute level from xp — never read the stored column directly
            (FLOOR(0.1 * SQRT(COALESCE(p.xp, 0))) + 1)::INT                       AS level,
            COALESCE(p.xp, 0)::INT                                                 AS xp,
            COALESCE(wx.week_xp, 0)::INT                                           AS xp_this_week,
            (p.id = auth.uid())                                                    AS is_current_user,
            p.country::TEXT
        FROM profiles p
        LEFT JOIN weekly_xp wx ON wx.user_id = p.id
        WHERE p.username IS NOT NULL OR p.id = auth.uid()
    )
    SELECT r.* FROM ranked r WHERE r.rank <= limit_count AND r.username IS NOT NULL
    UNION
    SELECT r.* FROM ranked r WHERE r.is_current_user = TRUE
    ORDER BY rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION global_leaderboard(INT) TO authenticated;

CREATE FUNCTION friends_leaderboard(limit_count INT DEFAULT 5)
RETURNS TABLE (
    rank           BIGINT,
    user_id        UUID,
    username       TEXT,
    display_name   TEXT,
    avatar_url     TEXT,
    level          INT,
    xp             INT,
    xp_this_week   INT,
    is_current_user BOOLEAN,
    country        TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH friend_ids AS (
        SELECT CASE WHEN f.user_id = auth.uid() THEN f.friend_id ELSE f.user_id END AS friend_id
        FROM friendships f
        WHERE (f.user_id = auth.uid() OR f.friend_id = auth.uid())
          AND f.status = 'accepted'
    ),
    user_pool AS (
        SELECT friend_id AS id FROM friend_ids
        UNION
        SELECT auth.uid() AS id
    ),
    weekly_xp AS (
        SELECT
            v.user_id,
            COUNT(*)::INT * 25 AS week_xp
        FROM visits v
        WHERE v.visited_at >= date_trunc('week', NOW())
          AND v.user_id IN (SELECT up.id FROM user_pool up)
        GROUP BY v.user_id
    ),
    ranked AS (
        SELECT
            ROW_NUMBER() OVER (ORDER BY COALESCE(p.xp, 0) DESC, p.created_at ASC) AS rank,
            p.id                                                                    AS user_id,
            p.username::TEXT,
            p.display_name::TEXT,
            p.avatar_url::TEXT,
            (FLOOR(0.1 * SQRT(COALESCE(p.xp, 0))) + 1)::INT                       AS level,
            COALESCE(p.xp, 0)::INT                                                 AS xp,
            COALESCE(wx.week_xp, 0)::INT                                           AS xp_this_week,
            (p.id = auth.uid())                                                    AS is_current_user,
            p.country::TEXT
        FROM user_pool up
        JOIN profiles p ON p.id = up.id
        LEFT JOIN weekly_xp wx ON wx.user_id = p.id
    )
    SELECT r.* FROM ranked r WHERE r.rank <= limit_count
    UNION
    SELECT r.* FROM ranked r WHERE r.is_current_user = TRUE
    ORDER BY rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION friends_leaderboard(INT) TO authenticated;
