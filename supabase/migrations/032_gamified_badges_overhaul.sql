-- Migration: Gamified Badges Overhaul (Issue #233)
-- Clear and replace with 30 achievable, round-number badges

-- 1. Clean up existing badges
DELETE FROM user_badges;
DELETE FROM badges;

-- 2. THE EXPLORER (Total Visits)
INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order)
VALUES
    ('explorer_1', 'Fresh Change', 'Your very first vending machine visit.', 'visit_count', '{"count": 1}', 'common', 1),
    ('explorer_5', 'Daily Route', 'You are making this a habit.', 'visit_count', '{"count": 5}', 'common', 2),
    ('explorer_10', 'Urban Nomad', 'The city is starting to feel like home.', 'visit_count', '{"count": 10}', 'common', 3),
    ('explorer_25', 'Steel Stroller', 'You can hear the hum of machines from blocks away.', 'visit_count', '{"count": 25}', 'rare', 4),
    ('explorer_50', 'Slot Master', 'One week of heavy exploration achieved.', 'visit_count', '{"count": 50}', 'rare', 5),
    ('explorer_100', 'Grid Veteran', 'A true master of the vending circuit.', 'visit_count', '{"count": 100}', 'epic', 6),
    ('explorer_200', 'Jihanki God', 'Legend says you never go thirsty.', 'visit_count', '{"count": 200}', 'legendary', 7);

-- 3. THE PIONEER (Contributions)
INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order)
VALUES
    ('pioneer_1', 'First Pin', 'You put a new machine on the map.', 'contribution_count', '{"count": 1}', 'common', 10),
    ('pioneer_5', 'Sharp Eye', 'You have a gift for spotting metal in the wild.', 'contribution_count', '{"count": 5}', 'common', 11),
    ('pioneer_10', 'Neighborhood Scout', 'Your local area is now fully mapped.', 'contribution_count', '{"count": 10}', 'rare', 12),
    ('pioneer_25', 'Map Maker', 'Expanding the boundaries of convenience.', 'contribution_count', '{"count": 25}', 'epic', 13),
    ('pioneer_50', 'Infrastructure Hero', 'The community owes you a cold drink.', 'contribution_count', '{"count": 50}', 'legendary', 14);

-- 4. THE SPECIALISTS (Category Visits)
-- Eats
INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order)
VALUES
    ('spec_eats_5', 'Midnight Snack', 'Found survival at 3 AM.', 'category_visit', '{"category": "eats", "count": 5}', 'rare', 20),
    ('spec_eats_20', 'Machine Gourmet', 'You know the best dispensers in town.', 'category_visit', '{"category": "eats", "count": 20}', 'epic', 21);

-- Gachapon
INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order)
VALUES
    ('spec_gacha_5', 'Crank it!', 'The thrill of the mystery capsule.', 'category_visit', '{"category": "gachapon", "count": 5}', 'rare', 22),
    ('spec_gacha_20', 'Plastic Dreams', 'Your shelves are full of tiny treasures.', 'category_visit', '{"category": "gachapon", "count": 20}', 'epic', 23);

-- Weird
INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order)
VALUES
    ('spec_weird_5', 'Wait, what?', 'You found something that should not exist.', 'category_visit', '{"category": "weird", "count": 5}', 'rare', 24),
    ('spec_weird_15', 'Abyss Gazer', 'The strange has looked back at you.', 'category_visit', '{"category": "weird", "count": 15}', 'epic', 25);

-- Retro
INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order)
VALUES
    ('spec_retro_5', 'Analog Heart', 'Levers, gears, and nostalgia.', 'category_visit', '{"category": "retro", "count": 5}', 'rare', 26),
    ('spec_retro_15', 'Showa Spirit', 'Living in 1975 for a brief moment.', 'category_visit', '{"category": "retro", "count": 15}', 'epic', 27);

-- Local Gems
INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order)
VALUES
    ('spec_gems_5', 'Hidden Gem', 'Not your average brand-name soda.', 'category_visit', '{"category": "local-gems", "count": 5}', 'rare', 28),
    ('spec_gems_15', 'Local Patron', 'Supporting the neighborhood artisan.', 'category_visit', '{"category": "local-gems", "count": 15}', 'epic', 29);

-- 5. THE GUARDIAN (Verifications)
INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order)
VALUES
    ('guard_5', 'Fact Checker', 'Keeping the network honest.', 'verification_count', '{"count": 5}', 'common', 40),
    ('guard_10', 'Truth Seeker', 'A guardian of accuracy.', 'verification_count', '{"count": 10}', 'common', 41),
    ('guard_25', 'Map Guardian', 'No ghost machines allowed on your watch.', 'verification_count', '{"count": 25}', 'rare', 42),
    ('guard_50', 'Vending Paladin', 'A reliable source of truth.', 'verification_count', '{"count": 50}', 'rare', 43),
    ('guard_100', 'Oracle of Truth', 'If you say it is there, it is there.', 'verification_count', '{"count": 100}', 'epic', 44),
    ('guard_150', 'Shield of the City', 'Protecting the map from obsolescence.', 'verification_count', '{"count": 150}', 'epic', 45),
    ('guard_250', 'Final Arbiter', 'The ultimate authority on machine existence.', 'verification_count', '{"count": 250}', 'legendary', 46);

-- 6. SOCIAL
INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order)
VALUES
    ('team_hunt', 'Team Hunt', 'The power of friendship (and coins).', 'referral_milestone', '{"count": 3}', 'rare', 100);
