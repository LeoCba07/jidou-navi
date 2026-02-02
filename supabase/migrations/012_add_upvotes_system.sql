-- Upvotes System Migration
-- Implements machine upvoting with weekly limits and XP rewards

-- ============================================
-- 1. MACHINE_UPVOTES TABLE
-- ============================================

CREATE TABLE machine_upvotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_machine_upvote UNIQUE (user_id, machine_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_machine_upvotes_machine_id ON machine_upvotes(machine_id);
CREATE INDEX idx_machine_upvotes_user_id ON machine_upvotes(user_id);
CREATE INDEX idx_machine_upvotes_created_at ON machine_upvotes(created_at);
CREATE INDEX idx_machine_upvotes_user_weekly ON machine_upvotes(user_id, created_at);

-- ============================================
-- 2. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE machine_upvotes ENABLE ROW LEVEL SECURITY;

-- Users can view all upvotes (for counting)
CREATE POLICY "Anyone can view upvotes"
    ON machine_upvotes FOR SELECT
    USING (true);

-- Users can create their own upvotes
CREATE POLICY "Users can create own upvotes"
    ON machine_upvotes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own upvotes
CREATE POLICY "Users can delete own upvotes"
    ON machine_upvotes FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 3. RPC FUNCTIONS
-- ============================================

-- Get user's weekly upvote count (resets every Monday)
CREATE OR REPLACE FUNCTION get_user_weekly_upvote_count()
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INT
        FROM machine_upvotes
        WHERE user_id = auth.uid()
          AND created_at >= date_trunc('week', NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has upvoted a specific machine
CREATE OR REPLACE FUNCTION has_upvoted_machine(p_machine_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM machine_upvotes
        WHERE user_id = auth.uid()
          AND machine_id = p_machine_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upvote a machine (with XP award)
CREATE OR REPLACE FUNCTION upvote_machine(p_machine_id UUID)
RETURNS JSON AS $$
DECLARE
    weekly_count INT;
    max_weekly_upvotes INT := 3;
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

    -- Check weekly limit
    SELECT COUNT(*)::INT INTO weekly_count
    FROM machine_upvotes
    WHERE user_id = auth.uid()
      AND created_at >= date_trunc('week', NOW());

    IF weekly_count >= max_weekly_upvotes THEN
        RETURN json_build_object('success', false, 'error', 'weekly_limit_reached');
    END IF;

    -- Create upvote
    INSERT INTO machine_upvotes (user_id, machine_id)
    VALUES (auth.uid(), p_machine_id);

    -- Award XP to the user who upvoted
    UPDATE profiles
    SET xp = COALESCE(xp, 0) + xp_per_upvote
    WHERE id = auth.uid();

    RETURN json_build_object(
        'success', true,
        'xp_awarded', xp_per_upvote,
        'remaining_votes', max_weekly_upvotes - weekly_count - 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove upvote from a machine (frees up vote slot but doesn't return XP)
CREATE OR REPLACE FUNCTION remove_upvote(p_machine_id UUID)
RETURNS JSON AS $$
DECLARE
    weekly_count INT;
    max_weekly_upvotes INT := 3;
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

    -- Get remaining weekly count
    SELECT COUNT(*)::INT INTO weekly_count
    FROM machine_upvotes
    WHERE user_id = auth.uid()
      AND created_at >= date_trunc('week', NOW());

    RETURN json_build_object(
        'success', true,
        'remaining_votes', max_weekly_upvotes - weekly_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get upvote count for a machine
CREATE OR REPLACE FUNCTION get_machine_upvote_count(p_machine_id UUID)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INT
        FROM machine_upvotes
        WHERE machine_id = p_machine_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's upvoted machine IDs
CREATE OR REPLACE FUNCTION get_user_upvoted_machine_ids()
RETURNS UUID[] AS $$
BEGIN
    RETURN (
        SELECT COALESCE(array_agg(machine_id), ARRAY[]::UUID[])
        FROM machine_upvotes
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Popular machines this week (visits + upvotes combined)
CREATE OR REPLACE FUNCTION popular_machines_this_week(limit_count INT DEFAULT 10)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    address TEXT,
    latitude FLOAT,
    longitude FLOAT,
    primary_photo_url TEXT,
    status TEXT,
    visit_count INT,
    upvote_count BIGINT,
    weekly_activity BIGINT,
    categories JSON
) AS $$
BEGIN
    RETURN QUERY
    WITH weekly_visits AS (
        SELECT
            v.machine_id,
            COUNT(*)::BIGINT as visit_count
        FROM visits v
        WHERE v.visited_at >= date_trunc('week', NOW())
        GROUP BY v.machine_id
    ),
    weekly_upvotes AS (
        SELECT
            u.machine_id,
            COUNT(*)::BIGINT as upvote_count
        FROM machine_upvotes u
        WHERE u.created_at >= date_trunc('week', NOW())
        GROUP BY u.machine_id
    ),
    total_upvotes AS (
        SELECT
            u.machine_id,
            COUNT(*)::BIGINT as total_count
        FROM machine_upvotes u
        GROUP BY u.machine_id
    )
    SELECT
        m.id,
        m.name::TEXT,
        m.description::TEXT,
        m.address::TEXT,
        m.latitude::FLOAT,
        m.longitude::FLOAT,
        m.primary_photo_url::TEXT,
        m.status::TEXT,
        COALESCE(m.visit_count, 0)::INT,
        COALESCE(tu.total_count, 0)::BIGINT as upvote_count,
        (COALESCE(wv.visit_count, 0) + COALESCE(wu.upvote_count, 0))::BIGINT as weekly_activity,
        m.categories
    FROM machines_with_details m
    LEFT JOIN weekly_visits wv ON wv.machine_id = m.id
    LEFT JOIN weekly_upvotes wu ON wu.machine_id = m.id
    LEFT JOIN total_upvotes tu ON tu.machine_id = m.id
    WHERE m.status = 'active'
      AND (COALESCE(wv.visit_count, 0) + COALESCE(wu.upvote_count, 0)) > 0
    ORDER BY weekly_activity DESC, m.visit_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nearby machines with engagement data
CREATE OR REPLACE FUNCTION nearby_machines_with_engagement(
    lat FLOAT,
    lng FLOAT,
    radius_meters INT DEFAULT 5000,
    limit_count INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    address TEXT,
    latitude FLOAT,
    longitude FLOAT,
    distance_meters FLOAT,
    primary_photo_url TEXT,
    status TEXT,
    visit_count INT,
    upvote_count BIGINT,
    categories JSON
) AS $$
BEGIN
    RETURN QUERY
    WITH machine_upvote_counts AS (
        SELECT
            u.machine_id,
            COUNT(*)::BIGINT as upvote_count
        FROM machine_upvotes u
        GROUP BY u.machine_id
    )
    SELECT
        m.id,
        m.name::TEXT,
        m.description::TEXT,
        m.address::TEXT,
        m.latitude::FLOAT,
        m.longitude::FLOAT,
        ST_Distance(
            m.location::geography,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
        )::FLOAT as distance_meters,
        m.primary_photo_url::TEXT,
        m.status::TEXT,
        COALESCE(m.visit_count, 0)::INT,
        COALESCE(muc.upvote_count, 0)::BIGINT,
        m.categories
    FROM machines_with_details m
    LEFT JOIN machine_upvote_counts muc ON muc.machine_id = m.id
    WHERE m.status = 'active'
      AND ST_DWithin(
          m.location::geography,
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
          radius_meters
      )
    ORDER BY distance_meters ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get recent visitors for a machine (for avatar display)
CREATE OR REPLACE FUNCTION get_machine_visitors(
    p_machine_id UUID,
    limit_count INT DEFAULT 5
)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    visited_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (v.user_id)
        v.user_id,
        p.username::TEXT,
        p.display_name::TEXT,
        p.avatar_url::TEXT,
        v.visited_at
    FROM visits v
    JOIN profiles p ON p.id = v.user_id
    WHERE v.machine_id = p_machine_id
      AND v.visited_at >= NOW() - INTERVAL '30 days'
    ORDER BY v.user_id, v.visited_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get total visitor count for a machine (last 30 days)
CREATE OR REPLACE FUNCTION get_machine_visitor_count(p_machine_id UUID)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT user_id)::INT
        FROM visits
        WHERE machine_id = p_machine_id
          AND visited_at >= NOW() - INTERVAL '30 days'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Weekly leaderboard with rewards calculation
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

-- ============================================
-- 4. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION get_user_weekly_upvote_count() TO authenticated;
GRANT EXECUTE ON FUNCTION has_upvoted_machine(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upvote_machine(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_upvote(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_machine_upvote_count(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_upvoted_machine_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION popular_machines_this_week(INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION nearby_machines_with_engagement(FLOAT, FLOAT, INT, INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_machine_visitors(UUID, INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_machine_visitor_count(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION weekly_leaderboard_with_rewards(INT) TO authenticated;
