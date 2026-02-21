-- Migration: Add Epic Master Badge
-- The ultimate achievement for visiting all available machines

BEGIN;

INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order)
VALUES
    ('epic_master', 'Master of the Grid', 'The ultimate achievement: You have visited EVERY machine currently on the map!', 'special', '{"count": 0}', 'legendary', 200)
ON CONFLICT (slug) DO NOTHING;

COMMIT;