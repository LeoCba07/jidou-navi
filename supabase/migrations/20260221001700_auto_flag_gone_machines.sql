-- Migration: Auto-flag machines when multiple users report them as "gone"
-- Issue #112: Verification Trust & Communication

-- ============================================
-- 1. CREATE machine_gone_reports TABLE
-- ============================================
-- Tracks when users report a machine as "gone" during check-in
-- Used to auto-flag machines after 2+ unique reports

CREATE TABLE IF NOT EXISTS machine_gone_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_machine_gone_report UNIQUE (machine_id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_gone_reports_machine_id ON machine_gone_reports(machine_id);
CREATE INDEX idx_gone_reports_user_id ON machine_gone_reports(user_id);

-- ============================================
-- 2. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE machine_gone_reports ENABLE ROW LEVEL SECURITY;

-- Users can view gone reports (for counting)
CREATE POLICY "Anyone can view gone reports"
    ON machine_gone_reports FOR SELECT
    USING (true);

-- Users can create their own gone reports
CREATE POLICY "Users can create own gone reports"
    ON machine_gone_reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. FUNCTION: Record gone report and auto-flag
-- ============================================

CREATE OR REPLACE FUNCTION record_machine_gone_report(p_machine_id UUID)
RETURNS JSON AS $$
DECLARE
    gone_count INT;
    flag_threshold INT := 2;
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'not_authenticated');
    END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FUNCTION: Get gone report count for a machine
-- ============================================

CREATE OR REPLACE FUNCTION get_machine_gone_report_count(p_machine_id UUID)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INT
        FROM machine_gone_reports
        WHERE machine_id = p_machine_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. FUNCTION: Clear gone reports (for admin use when machine is verified)
-- ============================================

CREATE OR REPLACE FUNCTION clear_machine_gone_reports(p_machine_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM machine_gone_reports
    WHERE machine_id = p_machine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. GRANTS
-- ============================================

GRANT EXECUTE ON FUNCTION record_machine_gone_report(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_machine_gone_report_count(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION clear_machine_gone_reports(UUID) TO authenticated;
