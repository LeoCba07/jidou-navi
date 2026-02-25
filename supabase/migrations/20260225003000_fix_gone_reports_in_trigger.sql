-- Fix: update_machine_counts trigger calls clear_machine_gone_reports() which
-- has an admin role check, causing all non-admin check-ins with still_exists=true
-- to fail with "Access denied: Admin role required".
-- Solution: inline the DELETE instead of calling the admin-only function.

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

            -- Clear gone reports if verified as still existing (inline, not via admin-only function)
            IF NEW.still_exists = TRUE THEN
                DELETE FROM machine_gone_reports WHERE machine_id = NEW.machine_id;
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
