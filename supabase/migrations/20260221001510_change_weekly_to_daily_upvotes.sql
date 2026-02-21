-- Migration: Change Weekly Upvote System to Daily
-- Issue #145: Higher user friction on Discover page
-- Changes all weekly upvote limits to daily limits (3 upvotes per day, reset at midnight)

-- ============================================
-- 1. UPDATE get_user_weekly_upvote_count → get_user_daily_upvote_count
-- ============================================

-- Drop old function
DROP FUNCTION IF EXISTS get_user_weekly_upvote_count();

-- Create new daily function
CREATE OR REPLACE FUNCTION get_user_daily_upvote_count()
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INT
        FROM machine_upvotes
        WHERE user_id = auth.uid()
          AND created_at >= date_trunc('day', NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_daily_upvote_count() TO authenticated;

-- ============================================
-- 2. UPDATE upvote_machine() - use daily limit
-- ============================================

CREATE OR REPLACE FUNCTION upvote_machine(p_machine_id UUID)
RETURNS JSON AS $$
DECLARE
    daily_count INT;
    max_daily_upvotes INT := 3;
    xp_per_upvote INT := 5;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_authenticated');
    END IF;

    -- Check if already upvoted this machine
    IF EXISTS (
        SELECT 1 FROM machine_upvotes
        WHERE user_id = auth.uid() AND machine_id = p_machine_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'already_upvoted');
    END IF;

    -- Check daily limit (changed from weekly)
    SELECT COUNT(*)::INT INTO daily_count
    FROM machine_upvotes
    WHERE user_id = auth.uid()
      AND created_at >= date_trunc('day', NOW());

    IF daily_count >= max_daily_upvotes THEN
        RETURN json_build_object('success', false, 'error', 'daily_limit_reached');
    END IF;

    -- Create upvote
    INSERT INTO machine_upvotes (user_id, machine_id)
    VALUES (auth.uid(), p_machine_id);

    -- Award XP to the user who upvoted and update level
    UPDATE profiles AS p
    SET
        xp = sub.new_xp,
        level = GREATEST(1, FLOOR(SQRT(sub.new_xp / 10)))::INT
    FROM (
        SELECT
            id,
            COALESCE(xp, 0) + xp_per_upvote AS new_xp
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. UPDATE remove_upvote() - use daily limit
-- ============================================

CREATE OR REPLACE FUNCTION remove_upvote(p_machine_id UUID)
RETURNS JSON AS $$
DECLARE
    daily_count INT;
    max_daily_upvotes INT := 3;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_authenticated');
    END IF;

    -- Check if upvote exists
    IF NOT EXISTS (
        SELECT 1 FROM machine_upvotes
        WHERE user_id = auth.uid() AND machine_id = p_machine_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'not_upvoted');
    END IF;

    -- Remove upvote
    DELETE FROM machine_upvotes
    WHERE user_id = auth.uid() AND machine_id = p_machine_id;

    -- Get remaining daily count
    SELECT COUNT(*)::INT INTO daily_count
    FROM machine_upvotes
    WHERE user_id = auth.uid()
      AND created_at >= date_trunc('day', NOW());

    RETURN json_build_object(
        'success', true,
        'remaining_votes', max_daily_upvotes - daily_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. KEEP popular_machines_this_week (no change)
-- ============================================
-- Note: Popular machines ranking remains weekly, only the upvote limit is daily
-- This keeps the "trending this week" feature intact while limiting daily upvotes

-- ============================================
-- 5. UPDATE weekly_leaderboard_with_rewards - keep weekly XP for upvotes
-- ============================================
-- Note: Leaderboard and upvote XP calculation both use weekly data
-- The leaderboard itself remains weekly (accumulates XP over the week)

CREATE OR REPLACE FUNCTION weekly_leaderboard_with_rewards(limit_count INT DEFAULT 10)
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
    is_weekly_champion BOOLEAN,
    champion_rank INT
) AS $$
BEGIN
    RETURN QUERY
    WITH weekly_xp AS (
        -- Calculate XP earned this week from visits (25 XP per visit)
        SELECT
            v.user_id,
            COUNT(*)::INT * 25 as visit_xp
        FROM visits v
        WHERE v.visited_at >= date_trunc('week', NOW())
        GROUP BY v.user_id
    ),
    weekly_upvote_xp AS (
        -- Calculate XP earned this week from upvotes (5 XP per upvote given)
        -- Note: upvotes are now daily limited but still count toward weekly leaderboard
        SELECT
            u.user_id,
            COUNT(*)::INT * 5 as upvote_xp
        FROM machine_upvotes u
        WHERE u.created_at >= date_trunc('week', NOW())
        GROUP BY u.user_id
    ),
    combined_weekly_xp AS (
        SELECT
            COALESCE(wx.user_id, wux.user_id) as user_id,
            COALESCE(wx.visit_xp, 0) + COALESCE(wux.upvote_xp, 0) as total_weekly_xp
        FROM weekly_xp wx
        FULL OUTER JOIN weekly_upvote_xp wux ON wx.user_id = wux.user_id
    ),
    ranked AS (
        SELECT
            ROW_NUMBER() OVER (ORDER BY COALESCE(cwx.total_weekly_xp, 0) DESC, p.created_at ASC) as rank,
            p.id as user_id,
            p.username::TEXT,
            p.display_name::TEXT,
            p.avatar_url::TEXT,
            COALESCE(p.level, 1)::INT as level,
            COALESCE(p.xp, 0)::INT as xp,
            COALESCE(cwx.total_weekly_xp, 0)::INT as xp_this_week,
            p.id = auth.uid() as is_current_user
        FROM profiles p
        LEFT JOIN combined_weekly_xp cwx ON cwx.user_id = p.id
        WHERE p.username IS NOT NULL
    )
    SELECT
        r.rank,
        r.user_id,
        r.username,
        r.display_name,
        r.avatar_url,
        r.level,
        r.xp,
        r.xp_this_week,
        r.is_current_user,
        r.rank <= 3 AND r.xp_this_week > 0 as is_weekly_champion,
        CASE WHEN r.rank <= 3 AND r.xp_this_week > 0 THEN r.rank::INT ELSE NULL END as champion_rank
    FROM ranked r
    ORDER BY r.rank ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
