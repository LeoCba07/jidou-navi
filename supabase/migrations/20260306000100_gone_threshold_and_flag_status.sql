-- Migration: Gone threshold → flagged status
-- Issue #350: Flagged/gone machines still appear on map
--
-- Changes:
-- 1. record_machine_gone_report: threshold 2→3, sets status='flagged' when reached
-- 2. clear_machine_gone_reports: also resolves auto-created not_exists flags, recalculates flag_count
-- 3. New RPC: get_flagged_machines (admin-only)
-- 4. New RPC: admin_restore_machine (admin-only)
-- 5. New RPC: admin_delete_machine (admin-only)

-- ============================================
-- 1. UPDATE record_machine_gone_report
-- ============================================

CREATE OR REPLACE FUNCTION record_machine_gone_report(p_machine_id UUID)
RETURNS JSON AS $$
DECLARE
    gone_count INT;
    flag_threshold INT := 3;
BEGIN
    PERFORM require_verified_email();
    PERFORM check_rate_limit('record_gone_report', 10, 60);

    -- Insert gone report (idempotent per user)
    INSERT INTO machine_gone_reports (machine_id, user_id)
    VALUES (p_machine_id, auth.uid())
    ON CONFLICT (machine_id, user_id) DO NOTHING;

    -- Count unique gone reports
    SELECT COUNT(*) INTO gone_count
    FROM machine_gone_reports
    WHERE machine_id = p_machine_id;

    -- If threshold reached, flag the machine
    IF gone_count >= flag_threshold THEN
        -- Set machine status to flagged
        UPDATE machines SET status = 'flagged'
        WHERE id = p_machine_id AND status = 'active';

        -- Create a flag record for admin visibility (if not already exists)
        IF NOT EXISTS (
            SELECT 1 FROM flags
            WHERE machine_id = p_machine_id
            AND reason = 'not_exists'
            AND status = 'pending'
        ) THEN
            INSERT INTO flags (machine_id, reported_by, reason, details, status)
            VALUES (
                p_machine_id,
                auth.uid(),
                'not_exists',
                'Auto-flagged: ' || gone_count || ' users reported this machine as gone',
                'pending'
            );
        END IF;
    END IF;

    RETURN json_build_object(
        'success', true,
        'gone_reports', gone_count,
        'flagged', gone_count >= flag_threshold
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- 2. UPDATE clear_machine_gone_reports
-- ============================================
-- Called inline from the trigger (not via RPC), so no admin guard needed.
-- Also resolves auto-created not_exists pending flags and recalculates flag_count.

CREATE OR REPLACE FUNCTION clear_machine_gone_reports(p_machine_id UUID)
RETURNS VOID AS $$
DECLARE
    resolved_count INT;
BEGIN
    -- Delete gone reports
    DELETE FROM machine_gone_reports
    WHERE machine_id = p_machine_id;

    -- Resolve auto-created not_exists pending flags
    UPDATE flags
    SET status = 'resolved'
    WHERE machine_id = p_machine_id
      AND reason = 'not_exists'
      AND status = 'pending';

    GET DIAGNOSTICS resolved_count = ROW_COUNT;

    -- Recalculate flag_count if any flags were resolved
    IF resolved_count > 0 THEN
        UPDATE machines
        SET flag_count = (
            SELECT COUNT(*) FROM flags
            WHERE machine_id = p_machine_id AND status = 'pending'
        )
        WHERE id = p_machine_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke direct call access (only callable from triggers via SECURITY DEFINER)
REVOKE EXECUTE ON FUNCTION clear_machine_gone_reports(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION clear_machine_gone_reports(UUID) FROM anon;

-- ============================================
-- 3. NEW RPC: get_flagged_machines (admin-only)
-- ============================================

CREATE OR REPLACE FUNCTION get_flagged_machines(
    limit_count INT DEFAULT 50,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    contributor_id UUID,
    contributor_username TEXT,
    contributor_display_name TEXT,
    primary_photo_url TEXT,
    gone_report_count BIGINT,
    created_at TIMESTAMPTZ,
    flagged_at TIMESTAMPTZ,
    flag_details TEXT
) AS $$
BEGIN
    -- Admin guard
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
        m.name,
        m.description,
        m.address,
        m.latitude,
        m.longitude,
        m.contributor_id,
        p.username AS contributor_username,
        p.display_name AS contributor_display_name,
        (
            SELECT mp.photo_url
            FROM machine_photos mp
            WHERE mp.machine_id = m.id AND mp.is_primary = TRUE AND mp.status = 'active'
            LIMIT 1
        ) AS primary_photo_url,
        (
            SELECT COUNT(*)
            FROM machine_gone_reports mgr
            WHERE mgr.machine_id = m.id
        ) AS gone_report_count,
        m.created_at,
        (
            SELECT f.created_at
            FROM flags f
            WHERE f.machine_id = m.id AND f.reason = 'not_exists'
            ORDER BY f.created_at DESC
            LIMIT 1
        ) AS flagged_at,
        (
            SELECT f.details
            FROM flags f
            WHERE f.machine_id = m.id AND f.reason = 'not_exists'
            ORDER BY f.created_at DESC
            LIMIT 1
        ) AS flag_details
    FROM machines m
    LEFT JOIN profiles p ON p.id = m.contributor_id
    WHERE m.status = 'flagged'
      AND EXISTS (SELECT 1 FROM flags f WHERE f.machine_id = m.id AND f.reason = 'not_exists')
    ORDER BY m.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_flagged_machines(INT, INT) TO authenticated;

-- ============================================
-- 4. NEW RPC: admin_restore_machine
-- ============================================

CREATE OR REPLACE FUNCTION admin_restore_machine(p_machine_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admin guard
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Set status back to active
    UPDATE machines
    SET status = 'active'
    WHERE id = p_machine_id AND status = 'flagged';

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Clear gone reports
    DELETE FROM machine_gone_reports
    WHERE machine_id = p_machine_id;

    -- Resolve pending not_exists flags
    UPDATE flags
    SET status = 'resolved'
    WHERE machine_id = p_machine_id
      AND reason = 'not_exists'
      AND status = 'pending';

    -- Recalculate flag_count
    UPDATE machines
    SET flag_count = (
        SELECT COUNT(*) FROM flags
        WHERE machine_id = p_machine_id AND status = 'pending'
    )
    WHERE id = p_machine_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_restore_machine(UUID) TO authenticated;

-- ============================================
-- 5. NEW RPC: admin_delete_machine
-- ============================================

CREATE OR REPLACE FUNCTION admin_delete_machine(p_machine_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admin guard
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Delete the machine (cascades to gone_reports, flags, photos, etc.)
    DELETE FROM machines WHERE id = p_machine_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_delete_machine(UUID) TO authenticated;

-- ============================================
-- 6. UPDATE update_machine_counts trigger
-- ============================================
-- Replace inline DELETE with PERFORM clear_machine_gone_reports()
-- so that flag-resolution logic (resolve not_exists flags, recalculate flag_count)
-- is also executed when a user verifies a machine as still existing.

CREATE OR REPLACE FUNCTION update_machine_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'visits' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE machines SET
                visit_count = visit_count + 1,
                verification_count = CASE WHEN NEW.still_exists = TRUE THEN verification_count + 1 ELSE verification_count END,
                last_verified_at = CASE WHEN NEW.still_exists = TRUE THEN NOW() ELSE last_verified_at END,
                last_verified_by = CASE WHEN NEW.still_exists = TRUE THEN NEW.user_id ELSE last_verified_by END,
                status = CASE
                    WHEN status = 'pending' AND (CASE WHEN NEW.still_exists = TRUE THEN verification_count + 1 ELSE verification_count END) >= 2
                    THEN 'active'::machine_status
                    ELSE status
                END,
                auto_activated = CASE
                    WHEN status = 'pending' AND (CASE WHEN NEW.still_exists = TRUE THEN verification_count + 1 ELSE verification_count END) >= 2
                    THEN TRUE
                    ELSE auto_activated
                END
            WHERE id = NEW.machine_id;

            -- Clear gone reports and resolve flags if verified as still existing
            IF NEW.still_exists = TRUE THEN
                PERFORM clear_machine_gone_reports(NEW.machine_id);
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE machines SET visit_count = visit_count - 1 WHERE id = OLD.machine_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'machine_photos' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE machines SET photo_count = photo_count + 1 WHERE id = NEW.machine_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE machines SET photo_count = photo_count - 1 WHERE id = OLD.machine_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'flags' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE machines SET
                flag_count = flag_count + 1,
                status = CASE WHEN flag_count + 1 >= 3 THEN 'flagged'::machine_status ELSE status END
            WHERE id = NEW.machine_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
