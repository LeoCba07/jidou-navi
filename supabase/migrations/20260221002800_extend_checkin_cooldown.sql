-- Migration: Extend check-in cooldown from 24 hours to 7 days
-- Purpose: Prevent users from visiting the same machine more than once per week

CREATE OR REPLACE FUNCTION enforce_visit_cooldown()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM visits
        WHERE user_id = NEW.user_id
          AND machine_id = NEW.machine_id
          AND visited_at >= NOW() - INTERVAL '7 days'
    ) THEN
        RAISE EXCEPTION 'already visited';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
