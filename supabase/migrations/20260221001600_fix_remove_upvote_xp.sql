-- Migration: Fix remove_upvote to deduct XP
-- Bug fix: When removing an upvote, XP should be deducted from the user

CREATE OR REPLACE FUNCTION remove_upvote(p_machine_id UUID)
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

    -- Deduct XP from user (ensure XP doesn't go below 0) and update level
    UPDATE profiles AS p
    SET
        xp = sub.new_xp,
        level = GREATEST(1, FLOOR(SQRT(sub.new_xp / 10)))::INT
    FROM (
        SELECT
            id,
            GREATEST(COALESCE(xp, 0) - xp_per_upvote, 0) AS new_xp
        FROM profiles
        WHERE id = auth.uid()
    ) AS sub
    WHERE p.id = sub.id;

    -- Get remaining daily count
    SELECT COUNT(*)::INT INTO daily_count
    FROM machine_upvotes
    WHERE user_id = auth.uid()
      AND created_at >= date_trunc('day', NOW());

    RETURN json_build_object(
        'success', true,
        'xp_deducted', xp_per_upvote,
        'remaining_votes', max_daily_upvotes - daily_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
