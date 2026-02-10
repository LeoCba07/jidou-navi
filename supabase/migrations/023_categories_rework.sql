-- Categories Rework (Issue #109)
-- Replace 8 generic categories with 5 discovery-oriented ones

-- 1. Insert new categories
INSERT INTO categories (slug, name, description, icon_name, color, display_order)
VALUES ('eats', 'Eats', 'Food, drinks, snacks, treats, and alcohol', 'utensils', '#FF4B4B', 1),
       ('local-gems', 'Local Gems', 'Local specialties and craft products', 'sparkles', '#2ECC71', 5)
ON CONFLICT (slug) DO NOTHING;

-- 2. For each machine with any old category, insert a single 'eats' row (if not already present)
INSERT INTO machine_categories (machine_id, category_id)
SELECT DISTINCT mc.machine_id, c_new.id
FROM machine_categories mc
JOIN categories c_old ON mc.category_id = c_old.id
JOIN categories c_new ON c_new.slug = 'eats'
WHERE c_old.slug IN ('drinks', 'food', 'ice-cream', 'coffee', 'alcohol')
  AND NOT EXISTS (
    SELECT 1 FROM machine_categories mc2
    WHERE mc2.machine_id = mc.machine_id
      AND mc2.category_id = c_new.id
  );

-- 3. Delete all machine_categories rows pointing at old categories
DELETE FROM machine_categories
WHERE category_id IN (
    SELECT id FROM categories WHERE slug IN ('drinks', 'food', 'ice-cream', 'coffee', 'alcohol')
);

-- 4. Delete old categories
DELETE FROM categories WHERE slug IN ('drinks', 'food', 'ice-cream', 'coffee', 'alcohol');

-- 5. Update display_order for remaining categories
UPDATE categories SET display_order = 1 WHERE slug = 'eats';
UPDATE categories SET display_order = 2 WHERE slug = 'gachapon';
UPDATE categories SET display_order = 3 WHERE slug = 'weird';
UPDATE categories SET display_order = 4 WHERE slug = 'retro';
UPDATE categories SET display_order = 5 WHERE slug = 'local-gems';
