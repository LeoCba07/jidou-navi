-- Recreate machines_with_details view to pick up columns added after initial creation
-- (directions_hint was added in 20260221000800 but the view's m.* was already expanded)
-- Must DROP + CREATE because CREATE OR REPLACE cannot change column list

DROP VIEW IF EXISTS machines_with_details;

CREATE VIEW machines_with_details AS
SELECT
    m.*,
    mp.photo_url as primary_photo_url,
    mp.thumbnail_url as primary_thumbnail_url,
    COALESCE(
        (SELECT json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'color', c.color))
        FROM machine_categories mc
        JOIN categories c ON c.id = mc.category_id
        WHERE mc.machine_id = m.id),
        '[]'::json
    ) as categories
FROM machines m
LEFT JOIN machine_photos mp ON mp.machine_id = m.id AND mp.is_primary = TRUE AND mp.status = 'active';

-- Restore permissions (only authenticated, anon was revoked in data_scraping_protection)
GRANT SELECT ON machines_with_details TO authenticated;
