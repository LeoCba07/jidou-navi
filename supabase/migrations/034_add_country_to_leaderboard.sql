-- Add country field to leaderboard functions
-- Both functions already join on profiles which has a country column (added in migration 009)
-- Must DROP first because changing the return type of an existing function is not allowed with CREATE OR REPLACE

DROP FUNCTION IF EXISTS global_leaderboard(INT);
DROP FUNCTION IF EXISTS friends_leaderboard(INT);

-- Global leaderboard with country
CREATE FUNCTION global_leaderboard(limit_count INT DEFAULT 10)
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
        -- Calculate XP earned this week from visits
        SELECT
            v.user_id,
            COUNT(*)::INT * 25 as week_xp -- 25 XP per visit
        FROM visits v
        WHERE v.visited_at >= date_trunc('week', NOW())
        GROUP BY v.user_id
    )
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
    ORDER BY p.xp DESC NULLS LAST, p.created_at ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant after drop
GRANT EXECUTE ON FUNCTION global_leaderboard(INT) TO authenticated;

-- Friends leaderboard with country
CREATE FUNCTION friends_leaderboard(limit_count INT DEFAULT 10)
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
        -- Get all friend IDs (both directions)
        SELECT CASE WHEN f.user_id = auth.uid() THEN f.friend_id ELSE f.user_id END as friend_id
        FROM friendships f
        WHERE (f.user_id = auth.uid() OR f.friend_id = auth.uid())
          AND f.status = 'accepted'
    ),
    user_pool AS (
        -- Friends + current user
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
          AND v.user_id IN (SELECT id FROM user_pool)
        GROUP BY v.user_id
    )
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
    ORDER BY p.xp DESC NULLS LAST, p.created_at ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION friends_leaderboard(INT) TO authenticated;
