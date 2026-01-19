-- Migration: Add new gamification badges
-- Run this on existing databases to add the new badges
-- This is idempotent (safe to run multiple times)

-- New visit milestones
INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order)
VALUES
    ('urban_forager', 'Urban Forager', 'The streets are your supermarket', 'visit_count', '{"count": 50}', 'rare', 4),
    ('vending_sensei', 'Vending Sensei', 'You have mastered the art of the machine', 'visit_count', '{"count": 250}', 'epic', 6),
    ('legend', 'Legend of Jidouhanbaiki', 'Your name echoes through vending history', 'visit_count', '{"count": 500}', 'legendary', 7)
ON CONFLICT (slug) DO NOTHING;

-- New contribution milestones
INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order)
VALUES
    ('spotter', 'Spotter', 'Your eyes are trained', 'contribution_count', '{"count": 5}', 'common', 11),
    ('pathfinder', 'Pathfinder', 'Building the map, one pin at a time', 'contribution_count', '{"count": 25}', 'rare', 13),
    ('archaeologist', 'Vending Archaeologist', 'Unearthing hidden treasures', 'contribution_count', '{"count": 50}', 'epic', 14),
    ('legendary_mapper', 'Legendary Mapper', 'The community owes you a Pocari Sweat', 'contribution_count', '{"count": 100}', 'legendary', 15)
ON CONFLICT (slug) DO NOTHING;

-- New category specialist badges
INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order)
VALUES
    ('oddity_collector', 'Oddity Collector', 'Seeker of the strange', 'category_visit', '{"category": "weird", "count": 10}', 'epic', 21),
    ('capsule_commander', 'Capsule Commander', 'The gacha gods smile upon you', 'category_visit', '{"category": "gachapon", "count": 25}', 'epic', 23),
    ('time_traveler', 'Time Traveler', 'Living in the Showa era', 'category_visit', '{"category": "retro", "count": 10}', 'epic', 25),
    ('caffeine_addict', 'Caffeine Addict', 'Running on liquid courage', 'category_visit', '{"category": "coffee", "count": 10}', 'rare', 26),
    ('thirst_quencher', 'Thirst Quencher', 'Hydration is your mission', 'category_visit', '{"category": "drinks", "count": 15}', 'common', 27),
    ('frozen_explorer', 'Frozen Explorer', 'Brain freeze champion', 'category_visit', '{"category": "ice-cream", "count": 5}', 'rare', 28),
    ('liquid_courage', 'Liquid Courage', 'Found the good stuff', 'category_visit', '{"category": "alcohol", "count": 5}', 'rare', 29),
    ('snack_attack', 'Snack Attack', 'Fueled by vending cuisine', 'category_visit', '{"category": "food", "count": 10}', 'rare', 30)
ON CONFLICT (slug) DO NOTHING;

-- New verification badges
INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order)
VALUES
    ('truth_seeker', 'Truth Seeker', 'Keeping the map honest', 'verification_count', '{"count": 5}', 'common', 41),
    ('fact_checker', 'Fact Checker', 'Guardian of accuracy', 'verification_count', '{"count": 25}', 'rare', 42),
    ('data_integrity', 'Data Integrity Officer', 'The database thanks you', 'verification_count', '{"count": 50}', 'epic', 43)
ON CONFLICT (slug) DO NOTHING;

-- Update display_order of existing badges to maintain proper ordering
UPDATE badges SET display_order = 5 WHERE slug = 'master_100';
UPDATE badges SET display_order = 10 WHERE slug = 'first_contribution';
UPDATE badges SET display_order = 12 WHERE slug = 'cartographer_10';
UPDATE badges SET display_order = 20 WHERE slug = 'weird_hunter';
UPDATE badges SET display_order = 22 WHERE slug = 'gachapon_addict';
UPDATE badges SET display_order = 24 WHERE slug = 'retro_lover';
UPDATE badges SET display_order = 40 WHERE slug = 'verifier';
