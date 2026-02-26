-- Add 'pending' to the photo_status enum so user-submitted photos can
-- sit in a moderation queue before becoming visible.
ALTER TYPE photo_status ADD VALUE IF NOT EXISTS 'pending';

-- Fix update_machine_counts() so photo_count only reflects publicly
-- visible (active) photos.
--
-- Before this change the trigger incremented photo_count on every
-- INSERT and decremented on every DELETE, regardless of status.  With
-- pending photos this caused photo_count to include hidden photos
-- (pending INSERT) while remove_photo() already counted only active
-- ones — producing inconsistent counts.
--
-- After this change:
--   INSERT  → increment only when NEW.status = 'active'
--   UPDATE  → increment when status changes TO 'active',
--             decrement when status changes FROM 'active'
--   DELETE  → decrement only when OLD.status = 'active'
--
-- The trigger is also extended to fire on UPDATE so that approving a
-- pending photo (pending → active) correctly increments the count.
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
            IF NEW.status = 'active' THEN
                UPDATE machines SET photo_count = photo_count + 1 WHERE id = NEW.machine_id;
            END IF;
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.status <> 'active' AND NEW.status = 'active' THEN
                UPDATE machines SET photo_count = photo_count + 1 WHERE id = NEW.machine_id;
            ELSIF OLD.status = 'active' AND NEW.status <> 'active' THEN
                UPDATE machines SET photo_count = photo_count - 1 WHERE id = NEW.machine_id;
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            IF OLD.status = 'active' THEN
                UPDATE machines SET photo_count = photo_count - 1 WHERE id = OLD.machine_id;
            END IF;
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

-- Recreate the photos trigger to also fire on UPDATE (status transitions).
DROP TRIGGER IF EXISTS trigger_photos_machine_count ON machine_photos;
CREATE TRIGGER trigger_photos_machine_count
    AFTER INSERT OR UPDATE OR DELETE ON machine_photos
    FOR EACH ROW EXECUTE FUNCTION update_machine_counts();
