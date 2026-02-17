-- Show top N + always include current user's row
-- Uses UNION to deduplicate when user is already in top N

DROP FUNCTION IF EXISTS global_leaderboard(INT);
DROP FUNCTION IF EXISTS friends_leaderboard(INT);

-- Global leaderboard: top N + current user
CREATE FUNCTION global_leaderboard(limit_count INT DEFAULT 5)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    level INT,
    xp INT,
    xp_this_week INT,
    is_current_user BOOLEAN,
    country TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH weekly_xp AS (
        SELECT
            v.user_id,
            COUNT(*)::INT * 25 as week_xp
        FROM visits v
        WHERE v.visited_at >= date_trunc('week', NOW())
        GROUP BY v.user_id
    ),
    ranked AS (
        SELECT
            ROW_NUMBER() OVER (ORDER BY COALESCE(p.xp, 0) DESC, p.created_at ASC) as rank,
            p.id as user_id,
            p.username::TEXT,
            p.display_name::TEXT,
            p.avatar_url::TEXT,
            COALESCE(p.level, 1)::INT as level,
            COALESCE(p.xp, 0)::INT as xp,
            COALESCE(wx.week_xp, 0)::INT as xp_this_week,
            p.id = auth.uid() as is_current_user,
            p.country::TEXT
        FROM profiles p
        LEFT JOIN weekly_xp wx ON wx.user_id = p.id
        WHERE p.username IS NOT NULL
    )
    -- Top N rows
    SELECT r.* FROM ranked r WHERE r.rank <= limit_count
    UNION
    -- Current user's row (deduplicated by UNION if already in top N)
    SELECT r.* FROM ranked r WHERE r.is_current_user = true
    ORDER BY rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION global_leaderboard(INT) TO authenticated;

-- Friends leaderboard: top N + current user
CREATE FUNCTION friends_leaderboard(limit_count INT DEFAULT 5)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    level INT,
    xp INT,
    xp_this_week INT,
    is_current_user BOOLEAN,
    country TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH friend_ids AS (
        SELECT CASE WHEN f.user_id = auth.uid() THEN f.friend_id ELSE f.user_id END as friend_id
        FROM friendships f
        WHERE (f.user_id = auth.uid() OR f.friend_id = auth.uid())
          AND f.status = 'accepted'
    ),
    user_pool AS (
        SELECT friend_id as id FROM friend_ids
        UNION
        SELECT auth.uid() as id
    ),
    weekly_xp AS (
        SELECT
            v.user_id,
            COUNT(*)::INT * 25 as week_xp
        FROM visits v
        WHERE v.visited_at >= date_trunc('week', NOW())
          AND v.user_id IN (SELECT up.id FROM user_pool up)
        GROUP BY v.user_id
    ),
    ranked AS (
        SELECT
            ROW_NUMBER() OVER (ORDER BY COALESCE(p.xp, 0) DESC, p.created_at ASC) as rank,
            p.id as user_id,
            p.username::TEXT,
            p.display_name::TEXT,
            p.avatar_url::TEXT,
            COALESCE(p.level, 1)::INT as level,
            COALESCE(p.xp, 0)::INT as xp,
            COALESCE(wx.week_xp, 0)::INT as xp_this_week,
            p.id = auth.uid() as is_current_user,
            p.country::TEXT
        FROM user_pool up
        JOIN profiles p ON p.id = up.id
        LEFT JOIN weekly_xp wx ON wx.user_id = p.id
    )
    SELECT r.* FROM ranked r WHERE r.rank <= limit_count
    UNION
    SELECT r.* FROM ranked r WHERE r.is_current_user = true
    ORDER BY rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION friends_leaderboard(INT) TO authenticated;
