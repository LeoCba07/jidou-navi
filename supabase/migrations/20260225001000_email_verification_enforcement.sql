-- Migration: Email Verification Enforcement (Issue #320 - P1)
-- Description: Enforce email verification server-side on all write operations.
-- Previously only enforced client-side via routing gate in _layout.tsx.

-- ============================================
-- 1. HELPER FUNCTION: require_verified_email()
-- Reusable check for all RPC functions that require a verified user.
-- ============================================

CREATE OR REPLACE FUNCTION require_verified_email()
RETURNS VOID AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    IF (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NULL THEN
        RAISE EXCEPTION 'Email verification required';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- 2. PATCH RPC FUNCTIONS
-- Replace auth.uid() IS NULL checks with require_verified_email()
-- ============================================

-- 2a. create_visit (from 20260221002010_security_hardening.sql)
CREATE OR REPLACE FUNCTION create_visit(
    p_machine_id UUID,
    p_user_lat DOUBLE PRECISION,
    p_user_lng DOUBLE PRECISION,
    p_still_exists BOOLEAN DEFAULT NULL,
    p_max_distance_meters INTEGER DEFAULT 100
)
RETURNS visits AS $$
DECLARE
    v_distance DOUBLE PRECISION;
    v_visit visits;
BEGIN
    -- Email verification check (replaces simple auth check)
    PERFORM require_verified_email();

    -- Rate limit: 20 visits per hour
    PERFORM check_rate_limit('create_visit', 20, 60);

    -- Calculate real distance server-side
    SELECT ST_Distance(
        location,
        ST_MakePoint(p_user_lng, p_user_lat)::geography
    ) INTO v_distance
    FROM machines WHERE id = p_machine_id;

    -- Reject if machine doesn't exist
    IF v_distance IS NULL THEN
        RAISE EXCEPTION 'Machine not found';
    END IF;

    -- Reject if too far
    IF v_distance > p_max_distance_meters THEN
        RAISE EXCEPTION 'Too far from machine to check in (% meters)', ROUND(v_distance::numeric, 1);
    END IF;

    -- Create the visit
    INSERT INTO visits (user_id, machine_id, checkin_location, distance_meters, still_exists)
    VALUES (
        auth.uid(),
        p_machine_id,
        ST_MakePoint(p_user_lng, p_user_lat)::geography,
        v_distance,
        p_still_exists
    )
    RETURNING * INTO v_visit;

    RETURN v_visit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2b. record_machine_gone_report (from 20260221002010_security_hardening.sql)
CREATE OR REPLACE FUNCTION record_machine_gone_report(p_machine_id UUID)
RETURNS JSON AS $$
DECLARE
    gone_count INT;
    flag_threshold INT := 2;
BEGIN
    -- Email verification check (replaces simple auth check)
    PERFORM require_verified_email();

    -- Rate limit: 10 gone reports per hour
    PERFORM check_rate_limit('record_gone_report', 10, 60);

    -- Insert gone report (will fail silently if already exists due to unique constraint)
    INSERT INTO machine_gone_reports (machine_id, user_id)
    VALUES (p_machine_id, auth.uid())
    ON CONFLICT (machine_id, user_id) DO NOTHING;

    -- Count unique gone reports for this machine
    SELECT COUNT(*) INTO gone_count
    FROM machine_gone_reports
    WHERE machine_id = p_machine_id;

    -- If threshold reached, create a flag for admin review
    IF gone_count >= flag_threshold THEN
        -- Check if flag already exists
        IF NOT EXISTS (
            SELECT 1 FROM flags
            WHERE machine_id = p_machine_id
            AND reason = 'not_exists'
            AND status = 'pending'
        ) THEN
            -- Create flag for admin review
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

-- 2c. remove_photo (from 20260221002010_security_hardening.sql)
CREATE OR REPLACE FUNCTION remove_photo(
    p_photo_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Email verification check
    PERFORM require_verified_email();

    -- Rate limit: 10 photo removals per hour (admins and developers bypass)
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin', 'developer')
    ) THEN
        PERFORM check_rate_limit('remove_photo', 10, 60);
    END IF;

    UPDATE machine_photos
    SET status = 'removed'
    WHERE id = p_photo_id
        AND (
            uploaded_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
            )
        );

    -- Update machine photo count
    IF FOUND THEN
        UPDATE machines m
        SET photo_count = (
            SELECT COUNT(*) FROM machine_photos mp
            WHERE mp.machine_id = m.id AND mp.status = 'active'
        )
        FROM machine_photos mp
        WHERE mp.id = p_photo_id AND m.id = mp.machine_id;
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2d. submit_machine (from 20260224001000_submit_machine_rate_limit.sql)
CREATE OR REPLACE FUNCTION submit_machine(
    p_name VARCHAR,
    p_description TEXT,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_directions_hint TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID) AS $$
BEGIN
    -- Email verification check (replaces simple auth check)
    PERFORM require_verified_email();

    -- Rate limit: 3 submissions per 24 hours (1440 minutes)
    -- Bypass for admins/devs to allow seeding
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND role IN ('admin', 'developer')
    ) THEN
        PERFORM check_rate_limit('submit_machine', 3, 1440);
    END IF;

    RETURN QUERY
    INSERT INTO machines (
        name,
        description,
        latitude,
        longitude,
        location,
        status,
        contributor_id,
        directions_hint
    )
    VALUES (
        p_name,
        p_description,
        p_latitude,
        p_longitude,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        'pending',
        auth.uid(),
        p_directions_hint
    )
    RETURNING machines.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2e. check_submission_limit (from 20260224001000_submit_machine_rate_limit.sql)
CREATE OR REPLACE FUNCTION check_submission_limit()
RETURNS BOOLEAN AS $$
BEGIN
    -- Email verification check (replaces simple auth check)
    PERFORM require_verified_email();

    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND role IN ('admin', 'developer')
    ) THEN
        PERFORM check_rate_limit('submit_machine', 3, 1440);
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2f. check_upload_limit (from 20260224002000_upload_photo_rate_limit.sql)
CREATE OR REPLACE FUNCTION check_upload_limit()
RETURNS BOOLEAN AS $$
BEGIN
    -- Email verification check (replaces simple auth check)
    PERFORM require_verified_email();

    -- Rate limit: 10 photo uploads per 60 minutes
    -- Bypass for admins/devs
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND role IN ('admin', 'developer')
    ) THEN
        PERFORM check_rate_limit('upload_photo', 10, 60);
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2g. upvote_machine (from 20260221001510_change_weekly_to_daily_upvotes.sql)
CREATE OR REPLACE FUNCTION upvote_machine(p_machine_id UUID)
RETURNS JSON AS $$
DECLARE
    daily_count INT;
    max_daily_upvotes INT := 3;
    xp_per_upvote INT := 5;
BEGIN
    -- Email verification check (replaces simple auth check)
    PERFORM require_verified_email();

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2h. remove_upvote (from 20260221001510_change_weekly_to_daily_upvotes.sql)
CREATE OR REPLACE FUNCTION remove_upvote(p_machine_id UUID)
RETURNS JSON AS $$
DECLARE
    daily_count INT;
    max_daily_upvotes INT := 3;
BEGIN
    -- Email verification check (replaces simple auth check)
    PERFORM require_verified_email();

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2i. report_machine (from 20260221002510_manual_report_machine.sql)
CREATE OR REPLACE FUNCTION report_machine(
    p_machine_id UUID,
    p_reason TEXT,
    p_details TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_valid_reasons TEXT[] := ARRAY['not_exists', 'duplicate', 'wrong_location', 'inappropriate', 'other'];
BEGIN
    -- Email verification check (replaces simple auth check)
    PERFORM require_verified_email();

    -- Validate reason
    IF NOT (p_reason = ANY(v_valid_reasons)) THEN
        RETURN json_build_object('success', false, 'error', 'invalid_reason');
    END IF;

    -- Require details for "other" reason
    IF p_reason = 'other' AND (p_details IS NULL OR TRIM(p_details) = '') THEN
        RETURN json_build_object('success', false, 'error', 'details_required');
    END IF;

    -- Check machine exists
    IF NOT EXISTS (SELECT 1 FROM machines WHERE id = p_machine_id) THEN
        RETURN json_build_object('success', false, 'error', 'machine_not_found');
    END IF;

    -- Check for existing report from same user on same machine (any status)
    IF EXISTS (
        SELECT 1 FROM flags
        WHERE machine_id = p_machine_id
        AND reported_by = auth.uid()
    ) THEN
        RETURN json_build_object('success', false, 'error', 'already_reported');
    END IF;

    -- Rate limit: max 5 reports per 60 minutes per user (uses shared rate limit helper)
    BEGIN
        PERFORM check_rate_limit('report_machine', 5, 60);
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', 'rate_limited');
    END;

    -- Insert the flag
    INSERT INTO flags (machine_id, reported_by, reason, details, status)
    VALUES (p_machine_id, auth.uid(), p_reason, p_details, 'pending');

    RETURN json_build_object('success', true);
END;
$$;

-- 2j. update_profile (from 20260221003010_remove_bio_add_name_cooldown.sql)
CREATE OR REPLACE FUNCTION update_profile(
    p_display_name TEXT DEFAULT NULL,
    p_receive_newsletter BOOLEAN DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_current_display_name TEXT;
    v_last_change TIMESTAMPTZ;
    v_days_remaining INT;
BEGIN
    -- Email verification check (replaces simple auth check)
    PERFORM require_verified_email();
    v_user_id := auth.uid();

    -- If display name is being changed, check cooldown
    IF p_display_name IS NOT NULL THEN
        SELECT display_name, last_display_name_change
        INTO v_current_display_name, v_last_change
        FROM profiles
        WHERE id = v_user_id;

        -- Only enforce cooldown if the name is actually different
        IF p_display_name IS DISTINCT FROM v_current_display_name THEN
            IF v_last_change IS NOT NULL AND v_last_change > NOW() - INTERVAL '14 days' THEN
                v_days_remaining := CEIL(EXTRACT(EPOCH FROM (v_last_change + INTERVAL '14 days' - NOW())) / 86400);
                RETURN json_build_object(
                    'success', false,
                    'error', 'name_change_cooldown',
                    'days_remaining', v_days_remaining
                );
            END IF;

            -- Update display name and set cooldown timestamp
            UPDATE profiles
            SET
                display_name = p_display_name,
                last_display_name_change = NOW(),
                receive_newsletter = COALESCE(p_receive_newsletter, receive_newsletter),
                updated_at = NOW()
            WHERE id = v_user_id;

            RETURN json_build_object('success', true);
        END IF;
    END IF;

    -- Update only non-name fields (or name unchanged)
    UPDATE profiles
    SET
        receive_newsletter = COALESCE(p_receive_newsletter, receive_newsletter),
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- 3. PATCH RLS INSERT POLICIES
-- Add email verification check to all write policies
-- ============================================

-- saved_machines INSERT
DROP POLICY IF EXISTS "Users can save machines" ON saved_machines;
CREATE POLICY "Users can save machines" ON saved_machines FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
);

-- saved_machines DELETE
DROP POLICY IF EXISTS "Users can unsave machines" ON saved_machines;
CREATE POLICY "Users can unsave machines" ON saved_machines FOR DELETE
USING (
    auth.uid() = user_id
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
);

-- machine_categories INSERT
DROP POLICY IF EXISTS "Auth users can add categories" ON machine_categories;
CREATE POLICY "Auth users can add categories" ON machine_categories FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
);

-- machine_photos INSERT
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON machine_photos;
CREATE POLICY "Authenticated users can upload photos" ON machine_photos FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
);

-- machines INSERT
DROP POLICY IF EXISTS "Authenticated users can create machines" ON machines;
CREATE POLICY "Authenticated users can create machines" ON machines FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
);

-- visits INSERT
DROP POLICY IF EXISTS "Users can create own visits" ON visits;
CREATE POLICY "Users can create own visits" ON visits FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
);

-- user_badges INSERT
DROP POLICY IF EXISTS "Users can earn badges" ON user_badges;
CREATE POLICY "Users can earn badges" ON user_badges FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
);

-- flags INSERT
DROP POLICY IF EXISTS "Users can create flags" ON flags;
CREATE POLICY "Users can create flags" ON flags FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
);

-- ============================================
-- 4. PATCH STORAGE BUCKET INSERT POLICIES
-- Add email verification check to upload policies
-- ============================================

-- machine-photos upload
DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;
CREATE POLICY "Users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'machine-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
);

-- avatars upload
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL
);
