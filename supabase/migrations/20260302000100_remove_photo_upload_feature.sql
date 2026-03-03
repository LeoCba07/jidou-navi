-- Migration: Remove community photo upload feature
-- Users can no longer add photos to existing machines.
-- Primary photo submitted with new machines still works.
-- Admin can still delete active photos from machine detail.

-- ============================================================
-- 1. Simplify ban_user: remove pending photo rejection
-- ============================================================
DROP FUNCTION IF EXISTS ban_user(UUID);

CREATE OR REPLACE FUNCTION ban_user(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_rejected_machines INT;
    v_machine RECORD;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Admin privileges required';
    END IF;

    UPDATE profiles SET is_banned = TRUE WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('banned', false, 'rejected_machines', 0);
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

    RETURN json_build_object(
        'banned', true,
        'rejected_machines', v_rejected_machines
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION ban_user(UUID) TO authenticated;

-- ============================================================
-- 2. Tighten machine_photos INSERT policy
--    Replace broad INSERT policy with one scoped to pending
--    machines owned by the current user. This enforces the
--    removal of community photo upload at the DB level.
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON machine_photos;
DROP POLICY IF EXISTS "Block banned users from uploading photos" ON machine_photos;

CREATE POLICY "Contributors can add photos to their pending machines"
    ON machine_photos
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM machines
            WHERE machines.id = machine_photos.machine_id
              AND machines.status = 'pending'
              AND machines.contributor_id = auth.uid()
        )
    );
