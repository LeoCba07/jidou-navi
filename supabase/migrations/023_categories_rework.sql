-- Categories Rework (Issue #109)
-- Replace 8 generic categories with 5 discovery-oriented ones

-- 1. Insert new categories
INSERT INTO categories (slug, name, description, icon_name, color, display_order)
VALUES ('eats', 'Eats', 'Food, drinks, snacks, treats, and alcohol', 'utensils', '#FF4B4B', 1),
       ('local-gems', 'Local Gems', 'Local specialties and craft products', 'sparkles', '#2ECC71', 5)
ON CONFLICT (slug) DO NOTHING;

-- 2. Reassign machine_categories: drinks, food, ice-cream, coffee, alcohol → eats
--    Only update rows where the machine doesn't already have an eats category
UPDATE machine_categories
SET category_id = (SELECT id FROM categories WHERE slug = 'eats')
WHERE category_id IN (
    SELECT id FROM categories WHERE slug IN ('drinks', 'food', 'ice-cream', 'coffee', 'alcohol')
)
AND machine_id NOT IN (
    SELECT machine_id FROM machine_categories
    WHERE category_id = (SELECT id FROM categories WHERE slug = 'eats')
);

-- Delete leftover duplicates (machines that had both food+drinks etc.)
DELETE FROM machine_categories
WHERE category_id IN (
    SELECT id FROM categories WHERE slug IN ('drinks', 'food', 'ice-cream', 'coffee', 'alcohol')
);

-- 3. Delete old categories
DELETE FROM categories WHERE slug IN ('drinks', 'food', 'ice-cream', 'coffee', 'alcohol');

-- 4. Update display_order for remaining categories
UPDATE categories SET display_order = 1 WHERE slug = 'eats';
UPDATE categories SET display_order = 2 WHERE slug = 'gachapon';
UPDATE categories SET display_order = 3 WHERE slug = 'weird';
UPDATE categories SET display_order = 4 WHERE slug = 'retro';
UPDATE categories SET display_order = 5 WHERE slug = 'local-gems';
