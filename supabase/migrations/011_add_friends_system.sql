-- Friends System Migration
-- Implements friend requests, friends list, and leaderboards

-- ============================================
-- 1. FRIENDSHIPS TABLE
-- ============================================

CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
    CONSTRAINT no_self_friendship CHECK (user_id != friend_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_friendships_user_accepted ON friendships(user_id) WHERE status = 'accepted';
CREATE INDEX idx_friendships_friend_accepted ON friendships(friend_id) WHERE status = 'accepted';
CREATE INDEX idx_friendships_pending ON friendships(friend_id, status) WHERE status = 'pending';
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);

-- ============================================
-- 2. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can view friendships they're part of
CREATE POLICY "Users can view own friendships"
    ON friendships FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friend requests (as sender)
CREATE POLICY "Users can send friend requests"
    ON friendships FOR INSERT
    WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Users can update requests they received (to accept) or delete their own
CREATE POLICY "Users can update received requests"
    ON friendships FOR UPDATE
    USING (auth.uid() = friend_id AND status = 'pending');

-- Users can delete friendships they're part of
CREATE POLICY "Users can delete own friendships"
    ON friendships FOR DELETE
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============================================
-- 3. RPC FUNCTIONS
-- ============================================

-- Search users by username or display_name with friendship status
CREATE OR REPLACE FUNCTION search_users(
    search_term TEXT,
    limit_count INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    level INT,
    xp INT,
    friendship_status TEXT,
    friendship_id UUID,
    is_sender BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.username::TEXT,
        p.display_name::TEXT,
        p.avatar_url::TEXT,
        COALESCE(p.level, 1)::INT as level,
        COALESCE(p.xp, 0)::INT as xp,
        CASE
            WHEN f1.status = 'accepted' OR f2.status = 'accepted' THEN 'accepted'
            WHEN f1.status = 'pending' THEN 'pending_sent'
            WHEN f2.status = 'pending' THEN 'pending_received'
            ELSE 'none'
        END::TEXT as friendship_status,
        COALESCE(f1.id, f2.id) as friendship_id,
        CASE
            WHEN f1.id IS NOT NULL THEN TRUE
            ELSE FALSE
        END as is_sender
    FROM profiles p
    LEFT JOIN friendships f1 ON f1.user_id = auth.uid() AND f1.friend_id = p.id
    LEFT JOIN friendships f2 ON f2.friend_id = auth.uid() AND f2.user_id = p.id
    WHERE
        p.id != auth.uid()
        AND (
            p.username ILIKE '%' || search_term || '%'
            OR p.display_name ILIKE '%' || search_term || '%'
        )
    ORDER BY
        -- Prioritize exact matches
        CASE WHEN p.username ILIKE search_term THEN 0 ELSE 1 END,
        CASE WHEN p.display_name ILIKE search_term THEN 0 ELSE 1 END,
        p.username
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send a friend request
CREATE OR REPLACE FUNCTION send_friend_request(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
    existing_request friendships%ROWTYPE;
    new_request friendships%ROWTYPE;
    target_profile profiles%ROWTYPE;
    sender_profile profiles%ROWTYPE;
BEGIN
    -- Cannot friend yourself
    IF target_user_id = auth.uid() THEN
        RETURN json_build_object('success', false, 'error', 'Cannot send friend request to yourself');
    END IF;

    -- Check if target user exists
    SELECT * INTO target_profile FROM profiles WHERE id = target_user_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Check for existing friendship/request (either direction)
    SELECT * INTO existing_request FROM friendships
    WHERE (user_id = auth.uid() AND friend_id = target_user_id)
       OR (user_id = target_user_id AND friend_id = auth.uid());

    IF FOUND THEN
        IF existing_request.status = 'accepted' THEN
            RETURN json_build_object('success', false, 'error', 'Already friends');
        ELSIF existing_request.user_id = auth.uid() THEN
            RETURN json_build_object('success', false, 'error', 'Request already sent');
        ELSE
            -- They already sent us a request, auto-accept it
            UPDATE friendships
            SET status = 'accepted', accepted_at = NOW()
            WHERE id = existing_request.id
            RETURNING * INTO new_request;

            RETURN json_build_object('success', true, 'auto_accepted', true, 'friendship_id', new_request.id);
        END IF;
    END IF;

    -- Create new friend request
    INSERT INTO friendships (user_id, friend_id, status)
    VALUES (auth.uid(), target_user_id, 'pending')
    RETURNING * INTO new_request;

    -- Get sender profile for notification
    SELECT * INTO sender_profile FROM profiles WHERE id = auth.uid();

    -- Create notification for recipient
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        target_user_id,
        'friend_request',
        'New Friend Request',
        COALESCE(sender_profile.display_name, sender_profile.username, 'Someone') || ' sent you a friend request',
        json_build_object(
            'sender_id', auth.uid(),
            'sender_username', sender_profile.username,
            'sender_display_name', sender_profile.display_name,
            'sender_avatar_url', sender_profile.avatar_url,
            'friendship_id', new_request.id
        )
    );

    RETURN json_build_object('success', true, 'friendship_id', new_request.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accept a friend request
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS JSON AS $$
DECLARE
    request_record friendships%ROWTYPE;
    accepter_profile profiles%ROWTYPE;
BEGIN
    -- Get the request
    SELECT * INTO request_record FROM friendships
    WHERE id = request_id AND friend_id = auth.uid() AND status = 'pending';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Friend request not found');
    END IF;

    -- Accept the request
    UPDATE friendships
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = request_id;

    -- Get accepter profile for notification
    SELECT * INTO accepter_profile FROM profiles WHERE id = auth.uid();

    -- Notify the sender that their request was accepted
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        request_record.user_id,
        'friend_request_accepted',
        'Friend Request Accepted',
        COALESCE(accepter_profile.display_name, accepter_profile.username, 'Someone') || ' accepted your friend request',
        json_build_object(
            'friend_id', auth.uid(),
            'friend_username', accepter_profile.username,
            'friend_display_name', accepter_profile.display_name,
            'friend_avatar_url', accepter_profile.avatar_url
        )
    );

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decline a friend request
CREATE OR REPLACE FUNCTION decline_friend_request(request_id UUID)
RETURNS JSON AS $$
BEGIN
    DELETE FROM friendships
    WHERE id = request_id AND friend_id = auth.uid() AND status = 'pending';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Friend request not found');
    END IF;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove a friend
CREATE OR REPLACE FUNCTION remove_friend(target_friend_id UUID)
RETURNS JSON AS $$
BEGIN
    DELETE FROM friendships
    WHERE status = 'accepted'
      AND ((user_id = auth.uid() AND friend_id = target_friend_id)
           OR (user_id = target_friend_id AND friend_id = auth.uid()));

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Friendship not found');
    END IF;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's friends list
CREATE OR REPLACE FUNCTION get_friends(
    limit_count INT DEFAULT 50,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    level INT,
    xp INT,
    friendship_id UUID,
    friends_since TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.username::TEXT,
        p.display_name::TEXT,
        p.avatar_url::TEXT,
        COALESCE(p.level, 1)::INT as level,
        COALESCE(p.xp, 0)::INT as xp,
        f.id as friendship_id,
        f.accepted_at as friends_since
    FROM friendships f
    JOIN profiles p ON (
        (f.user_id = auth.uid() AND f.friend_id = p.id)
        OR (f.friend_id = auth.uid() AND f.user_id = p.id)
    )
    WHERE f.status = 'accepted'
    ORDER BY p.username
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending friend requests (incoming)
CREATE OR REPLACE FUNCTION get_pending_friend_requests()
RETURNS TABLE (
    id UUID,
    sender_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    level INT,
    xp INT,
    sent_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.id,
        p.id as sender_id,
        p.username::TEXT,
        p.display_name::TEXT,
        p.avatar_url::TEXT,
        COALESCE(p.level, 1)::INT as level,
        COALESCE(p.xp, 0)::INT as xp,
        f.created_at as sent_at
    FROM friendships f
    JOIN profiles p ON f.user_id = p.id
    WHERE f.friend_id = auth.uid() AND f.status = 'pending'
    ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending friend requests count
CREATE OR REPLACE FUNCTION get_pending_friend_requests_count()
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INT
        FROM friendships
        WHERE friend_id = auth.uid() AND status = 'pending'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Global leaderboard (top users by XP this week)
CREATE OR REPLACE FUNCTION global_leaderboard(limit_count INT DEFAULT 10)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    level INT,
    xp INT,
    xp_this_week INT,
    is_current_user BOOLEAN
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
        p.id = auth.uid() as is_current_user
    FROM profiles p
    LEFT JOIN weekly_xp wx ON wx.user_id = p.id
    WHERE p.username IS NOT NULL
    ORDER BY p.xp DESC NULLS LAST, p.created_at ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Friends leaderboard (friends + current user ranked by XP)
CREATE OR REPLACE FUNCTION friends_leaderboard(limit_count INT DEFAULT 10)
RETURNS TABLE (
    rank BIGINT,
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    level INT,
    xp INT,
    xp_this_week INT,
    is_current_user BOOLEAN
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
        p.id = auth.uid() as is_current_user
    FROM user_pool up
    JOIN profiles p ON p.id = up.id
    LEFT JOIN weekly_xp wx ON wx.user_id = p.id
    ORDER BY p.xp DESC NULLS LAST, p.created_at ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. MILESTONE NOTIFICATION TRIGGER
-- ============================================

-- Milestone levels for notifications
CREATE OR REPLACE FUNCTION notify_friends_on_milestone()
RETURNS TRIGGER AS $$
DECLARE
    milestone_levels INT[] := ARRAY[10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    old_level INT;
    new_level INT;
    friend_record RECORD;
    user_profile profiles%ROWTYPE;
BEGIN
    old_level := COALESCE(OLD.level, 1);
    new_level := COALESCE(NEW.level, 1);

    -- Check if user crossed a milestone level
    IF new_level > old_level AND new_level = ANY(milestone_levels) THEN
        -- Get the user's profile info
        SELECT * INTO user_profile FROM profiles WHERE id = NEW.id;

        -- Notify all accepted friends
        FOR friend_record IN
            SELECT
                CASE WHEN f.user_id = NEW.id THEN f.friend_id ELSE f.user_id END as friend_id
            FROM friendships f
            WHERE (f.user_id = NEW.id OR f.friend_id = NEW.id)
              AND f.status = 'accepted'
        LOOP
            INSERT INTO notifications (user_id, type, title, message, data)
            VALUES (
                friend_record.friend_id,
                'friend_milestone',
                'Friend Leveled Up!',
                COALESCE(user_profile.display_name, user_profile.username, 'Your friend')
                    || ' reached Level ' || new_level || '!',
                json_build_object(
                    'friend_id', NEW.id,
                    'friend_username', user_profile.username,
                    'friend_display_name', user_profile.display_name,
                    'friend_avatar_url', user_profile.avatar_url,
                    'new_level', new_level
                )
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles for level changes
DROP TRIGGER IF EXISTS trigger_notify_friends_on_milestone ON profiles;
CREATE TRIGGER trigger_notify_friends_on_milestone
    AFTER UPDATE OF level ON profiles
    FOR EACH ROW
    WHEN (OLD.level IS DISTINCT FROM NEW.level)
    EXECUTE FUNCTION notify_friends_on_milestone();

-- ============================================
-- 5. GRANTS
-- ============================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION search_users(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_friend_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_friend(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_friends(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_friend_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_friend_requests_count() TO authenticated;
GRANT EXECUTE ON FUNCTION global_leaderboard(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION friends_leaderboard(INT) TO authenticated;
