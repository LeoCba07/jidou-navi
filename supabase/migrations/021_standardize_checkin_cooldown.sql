-- Migration: Standardize check-in cooldown to 24 hours
-- Purpose: Replace calendar-day based restriction with a rolling 24-hour cooldown

-- 1. Remove the old UTC calendar-day based unique index
DROP INDEX IF EXISTS idx_visits_unique_daily;

-- 2. Create a function to enforce the 24-hour cooldown
CREATE OR REPLACE FUNCTION enforce_visit_cooldown()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM visits
        WHERE user_id = NEW.user_id
          AND machine_id = NEW.machine_id
          AND visited_at >= NOW() - INTERVAL '24 hours'
    ) THEN
        RAISE EXCEPTION 'already visited';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS trigger_enforce_visit_cooldown ON visits;
CREATE TRIGGER trigger_enforce_visit_cooldown
    BEFORE INSERT ON visits
    FOR EACH ROW EXECUTE FUNCTION enforce_visit_cooldown();
