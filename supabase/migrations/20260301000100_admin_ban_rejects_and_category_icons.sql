-- Migration: Admin dashboard fixes (#348, #351, #352, #353)
-- 1. ban_user now also rejects pending submissions and returns JSON with counts
-- 2. get_pending_machines now includes icon_name in category objects

-- ============================================================
-- 1. Recreate ban_user to reject pending submissions (#353)
-- ============================================================
DROP FUNCTION IF EXISTS ban_user(UUID);

CREATE OR REPLACE FUNCTION ban_user(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_rejected_machines INT;
    v_rejected_photos INT;
    v_machine RECORD;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Admin privileges required';
    END IF;

    UPDATE profiles SET is_banned = TRUE WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('banned', false, 'rejected_machines', 0, 'rejected_photos', 0);
    END IF;

    -- Reject all pending machine submissions with full audit metadata
    v_rejected_machines := 0;
    FOR v_machine IN
        SELECT id, name FROM machines
        WHERE contributor_id = p_user_id AND status = 'pending'
    LOOP
        UPDATE machines SET
            status = 'rejected',
            reviewed_at = NOW(),
            reviewed_by = auth.uid(),
            rejection_reason = 'Auto-rejected: user banned'
        WHERE id = v_machine.id;

        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            p_user_id,
            'machine_rejected',
            'Submission Not Approved',
            'Your submission "' || COALESCE(v_machine.name, 'Unnamed Machine') || '" was not approved. Reason: Auto-rejected: user banned',
            jsonb_build_object('machine_id', v_machine.id, 'machine_name', v_machine.name, 'reason', 'Auto-rejected: user banned')
        );

        v_rejected_machines := v_rejected_machines + 1;
    END LOOP;

    -- Remove all pending photo submissions from the banned user
    UPDATE machine_photos SET status = 'removed'
    WHERE uploaded_by = p_user_id AND status = 'pending';
    GET DIAGNOSTICS v_rejected_photos = ROW_COUNT;

    RETURN json_build_object(
        'banned', true,
        'rejected_machines', v_rejected_machines,
        'rejected_photos', v_rejected_photos
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION ban_user(UUID) TO authenticated;

-- ============================================================
-- 2. Recreate get_pending_machines to include icon_name (#352)
-- ============================================================
DROP FUNCTION IF EXISTS get_pending_machines(INT, INT);

CREATE OR REPLACE FUNCTION get_pending_machines(
    limit_count INT DEFAULT 50,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address TEXT,
    status machine_status,
    contributor_id UUID,
    contributor_username TEXT,
    contributor_display_name TEXT,
    contributor_avatar_url TEXT,
    primary_photo_url TEXT,
    created_at TIMESTAMPTZ,
    nearby_count BIGINT,
    directions_hint TEXT,
    categories JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    RETURN QUERY
    SELECT
        m.id,
        m.name::TEXT,
        m.description,
        m.latitude,
        m.longitude,
        m.address,
        m.status,
        m.contributor_id,
        p.username::TEXT AS contributor_username,
        p.display_name::TEXT AS contributor_display_name,
        p.avatar_url::TEXT AS contributor_avatar_url,
        (
            SELECT mp.photo_url
            FROM machine_photos mp
            WHERE mp.machine_id = m.id
            AND mp.is_primary = true
            LIMIT 1
        ) AS primary_photo_url,
        m.created_at,
        (
            SELECT COUNT(*)
            FROM machines nearby
            WHERE nearby.id != m.id
            AND nearby.status = 'active'
            AND ST_DWithin(
                nearby.location::geography,
                m.location::geography,
                50
            )
        ) AS nearby_count,
        m.directions_hint::TEXT,
        COALESCE(
            (SELECT json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'color', c.color, 'icon_name', c.icon_name))
            FROM machine_categories mc
            JOIN categories c ON c.id = mc.category_id
            WHERE mc.machine_id = m.id),
            '[]'::json
        ) AS categories
    FROM machines m
    LEFT JOIN profiles p ON p.id = m.contributor_id
    WHERE m.status = 'pending'
    ORDER BY m.created_at ASC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pending_machines TO authenticated;
