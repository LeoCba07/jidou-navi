ORDER BY m.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- VISIT COOLDOWN ENFORCEMENT
-- ================================================
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

CREATE TRIGGER trigger_enforce_visit_cooldown
    BEFORE INSERT ON visits
    FOR EACH ROW EXECUTE FUNCTION enforce_visit_cooldown();

-- 11. GRANTS
-- ================================
GRANT EXECUTE ON FUNCTION record_machine_gone_report(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_machine_gone_reports(UUID) TO authenticated;