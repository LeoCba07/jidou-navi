-- Fix: reject_machine fails when the contributor has deleted their account
-- (contributor_id is NULL). Allow rejection, just skip the notification.

CREATE OR REPLACE FUNCTION reject_machine(
    machine_id UUID,
    reviewer_id UUID,
    reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_contributor_id UUID;
    v_machine_name TEXT;
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    -- Get machine info
    SELECT m.contributor_id, m.name INTO v_contributor_id, v_machine_name
    FROM machines m
    WHERE m.id = machine_id AND m.status = 'pending';

    -- Machine not found or not pending
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Update machine status
    UPDATE machines
    SET
        status = 'rejected',
        reviewed_at = NOW(),
        reviewed_by = reviewer_id,
        rejection_reason = reason
    WHERE machines.id = machine_id;

    -- Create notification for contributor (skip if account was deleted)
    IF v_contributor_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            v_contributor_id,
            'machine_rejected',
            'Submission Not Approved',
            'Your submission "' || COALESCE(v_machine_name, 'Unnamed Machine') || '" was not approved. Reason: ' || reason,
            jsonb_build_object('machine_id', machine_id, 'machine_name', v_machine_name, 'reason', reason)
        );
    END IF;

    RETURN TRUE;
END;
$$;
