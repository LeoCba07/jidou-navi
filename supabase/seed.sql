-- JidouNavi Seed Data - Akihabara Vending Machines
-- Run in Supabase SQL Editor after schema.sql
-- ================================================
-- Sources:
-- - Tokyo Cheapo: https://tokyocheapo.com/entertainment/tokyo-best-vending-machines/
-- - ByFood: https://www.byfood.com/blog/tokyo-vending-machines-p-658
-- - DiGJapan: https://digjapan.travel/en/blog/id=12454

-- 1. INSERT CATEGORIES
-- ================================================
INSERT INTO categories (slug, name, description, icon_name, color, display_order) VALUES
  ('drinks', 'Drinks', 'Beverages, coffee, tea, juice', 'cup', '#3C91E6', 1),
  ('food', 'Food', 'Hot food, snacks, meals', 'restaurant', '#FF9F1C', 2),
  ('gachapon', 'Gachapon', 'Capsule toy machines', 'dice', '#E91E63', 3),
  ('weird', 'Weird', 'Unusual and unique items', 'sparkles', '#9C27B0', 4),
  ('retro', 'Retro', 'Vintage and nostalgic machines', 'time', '#795548', 5)
ON CONFLICT (slug) DO NOTHING;

-- 2. INSERT MACHINES
-- ================================================
-- Note: location is PostGIS geography point (longitude, latitude)

-- Horror Vending Machine Corner (Creepy Corner)
INSERT INTO machines (id, location, latitude, longitude, name, description, address, status) VALUES
  ('11111111-1111-1111-1111-111111111101',
   ST_SetSRID(ST_MakePoint(139.7730, 35.6960), 4326)::geography,
   35.6960, 139.7730,
   'Horror Vending Machine Corner',
   'Famous collection of mysterious, run-down vending machines. Sells canned oden, yakitori, and other unusual items. A must-visit for weird vending machine fans.',
   '2-19-7 Kanda Sudacho, Chiyoda-ku, Tokyo',
   'active'),

  ('11111111-1111-1111-1111-111111111102',
   ST_SetSRID(ST_MakePoint(139.7731, 35.6961), 4326)::geography,
   35.6961, 139.7731,
   'Retro Popcorn Machine',
   'Vintage popcorn vending machine at the Horror Corner. Makes fresh hot popcorn on demand. Very retro aesthetic.',
   '2-19-7 Kanda Sudacho, Chiyoda-ku, Tokyo',
   'active'),

  ('11111111-1111-1111-1111-111111111103',
   ST_SetSRID(ST_MakePoint(139.7729, 35.6959), 4326)::geography,
   35.6959, 139.7729,
   'Canned Oden Machine',
   'Sells room-temperature oden in a can. Surprisingly okay if you can get past the temperature.',
   '2-19-7 Kanda Sudacho, Chiyoda-ku, Tokyo',
   'active');

-- MOGBUG Insect Vending Machine
INSERT INTO machines (id, location, latitude, longitude, name, description, address, status) VALUES
  ('11111111-1111-1111-1111-111111111104',
   ST_SetSRID(ST_MakePoint(139.7755, 35.6985), 4326)::geography,
   35.6985, 139.7755,
   'MOGBUG Insect Vending Machine',
   'Sells edible insects including crickets, grasshoppers, and other crunchy critters. Open 24 hours.',
   '2-14-7 Kanda Sakumacho, Chiyoda-ku, Tokyo',
   'active');

-- King''s Treasure Box
INSERT INTO machines (id, location, latitude, longitude, name, description, address, status) VALUES
  ('11111111-1111-1111-1111-111111111105',
   ST_SetSRID(ST_MakePoint(139.7710, 35.6983), 4326)::geography,
   35.6983, 139.7710,
   'King''s Treasure Mystery Box',
   'Mystery box vending machine for ¥1,000. Could win trading cards, a Nintendo Switch, or PlayStation 5. Next to KFC.',
   '1-4-11 Sotokanda, Chiyoda-ku, Tokyo',
   'active');

-- Seven''s Crepe
INSERT INTO machines (id, location, latitude, longitude, name, description, address, status) VALUES
  ('11111111-1111-1111-1111-111111111106',
   ST_SetSRID(ST_MakePoint(139.7742, 35.6984), 4326)::geography,
   35.6984, 139.7742,
   'Seven''s Ice Crepe',
   'Frozen crepe vending machine serving Japan''s famous ice crepes. Located on a brightly lit street near Akihabara Station.',
   'Near Akihabara Station, Chiyoda-ku, Tokyo',
   'active');

-- JR Akihabara Station Milk Stand
INSERT INTO machines (id, location, latitude, longitude, name, description, address, status) VALUES
  ('11111111-1111-1111-1111-111111111107',
   ST_SetSRID(ST_MakePoint(139.7740, 35.6982), 4326)::geography,
   35.6982, 139.7740,
   'Milk Stand Platform 5',
   'Unique milk stand on JR Akihabara Station Platform 5. Stocks bottled milk from all over Japan including vanilla-flavored milk from Kumamoto.',
   'JR Akihabara Station Platform 5, Chiyoda-ku, Tokyo',
   'active');

-- Niku no Mansei Pork Cutlet Sandwich
INSERT INTO machines (id, location, latitude, longitude, name, description, address, status) VALUES
  ('11111111-1111-1111-1111-111111111108',
   ST_SetSRID(ST_MakePoint(139.7718, 35.6970), 4326)::geography,
   35.6970, 139.7718,
   'Niku no Mansei Katsu Sando',
   'Vending machine from the famous Niku no Mansei restaurant (est. 1949). Sells their legendary pork cutlet sandwiches 24/7.',
   'Near Akihabara, Chiyoda-ku, Tokyo',
   'active');

-- AKB48 Idol Card Machine
INSERT INTO machines (id, location, latitude, longitude, name, description, address, status) VALUES
  ('11111111-1111-1111-1111-111111111109',
   ST_SetSRID(ST_MakePoint(139.7705, 35.6990), 4326)::geography,
   35.6990, 139.7705,
   'AKB48 Photo Card Machine',
   'Collectible photo cards featuring members of AKB48, the famous idol group that originated in Akihabara.',
   'Sotokanda, Chiyoda-ku, Tokyo',
   'active');

-- Gachapon Kaikan
INSERT INTO machines (id, location, latitude, longitude, name, description, address, status) VALUES
  ('11111111-1111-1111-1111-111111111110',
   ST_SetSRID(ST_MakePoint(139.7715, 35.6995), 4326)::geography,
   35.6995, 139.7715,
   'Gachapon Kaikan Entrance',
   'One of many gachapon machines outside the famous Gachapon Kaikan building. Hundreds of capsule toy machines inside.',
   '3-15-5 Sotokanda, Chiyoda-ku, Tokyo',
   'active'),

  ('11111111-1111-1111-1111-111111111111',
   ST_SetSRID(ST_MakePoint(139.7716, 35.6996), 4326)::geography,
   35.6996, 139.7716,
   'Anime Figure Gachapon',
   'Gachapon machine with popular anime character figures. Changes inventory regularly.',
   '3-15-5 Sotokanda, Chiyoda-ku, Tokyo',
   'active');

-- Random drink machines around Akihabara
INSERT INTO machines (id, location, latitude, longitude, name, description, address, status) VALUES
  ('11111111-1111-1111-1111-111111111112',
   ST_SetSRID(ST_MakePoint(139.7735, 35.6975), 4326)::geography,
   35.6975, 139.7735,
   'Dydo Coffee Machine',
   'Standard Dydo drink vending machine with hot and cold coffee options. Nothing special but reliable.',
   'Kanda Sakumacho, Chiyoda-ku, Tokyo',
   'active'),

  ('11111111-1111-1111-1111-111111111113',
   ST_SetSRID(ST_MakePoint(139.7720, 35.6965), 4326)::geography,
   35.6965, 139.7720,
   'Coca-Cola Freestyle',
   'Modern Coca-Cola vending machine with multiple flavor options.',
   'Sotokanda, Chiyoda-ku, Tokyo',
   'active'),

  ('11111111-1111-1111-1111-111111111114',
   ST_SetSRID(ST_MakePoint(139.7750, 35.6978), 4326)::geography,
   35.6978, 139.7750,
   'Boss Coffee Corner',
   'Suntory Boss coffee machine. Tommy Lee Jones approved.',
   'Akihabara Electric Town, Chiyoda-ku, Tokyo',
   'active'),

  ('11111111-1111-1111-1111-111111111115',
   ST_SetSRID(ST_MakePoint(139.7708, 35.6988), 4326)::geography,
   35.6988, 139.7708,
   'Pokka Sapporo Machine',
   'Sells hot corn soup in cans during winter. A Japanese vending machine classic.',
   'Sotokanda, Chiyoda-ku, Tokyo',
   'active');

-- More unique machines
INSERT INTO machines (id, location, latitude, longitude, name, description, address, status) VALUES
  ('11111111-1111-1111-1111-111111111116',
   ST_SetSRID(ST_MakePoint(139.7745, 35.6992), 4326)::geography,
   35.6992, 139.7745,
   'Bandai Gashapon Store',
   'Official Bandai gachapon area with rare and exclusive capsule toys.',
   'Akihabara UDX, Chiyoda-ku, Tokyo',
   'active'),

  ('11111111-1111-1111-1111-111111111117',
   ST_SetSRID(ST_MakePoint(139.7738, 35.6968), 4326)::geography,
   35.6968, 139.7738,
   'Animate Card Machine',
   'Trading card vending machine outside Animate store. Sells anime and game cards.',
   'Near Animate Akihabara, Chiyoda-ku, Tokyo',
   'active'),

  ('11111111-1111-1111-1111-111111111118',
   ST_SetSRID(ST_MakePoint(139.7722, 35.6958), 4326)::geography,
   35.6958, 139.7722,
   'Canned Bread Machine',
   'Emergency preparedness vending machine selling canned bread with long shelf life.',
   'Kanda Sudacho, Chiyoda-ku, Tokyo',
   'active'),

  ('11111111-1111-1111-1111-111111111119',
   ST_SetSRID(ST_MakePoint(139.7712, 35.6972), 4326)::geography,
   35.6972, 139.7712,
   'Umbrella Vending Machine',
   'Sells cheap umbrellas for sudden Tokyo rain. Lifesaver during rainy season.',
   'Near Akihabara Station, Chiyoda-ku, Tokyo',
   'active'),

  ('11111111-1111-1111-1111-111111111120',
   ST_SetSRID(ST_MakePoint(139.7748, 35.6955), 4326)::geography,
   35.6955, 139.7748,
   'Dashi Stock Machine',
   'Sells fresh dashi (Japanese soup stock) in bottles. Popular with home cooks.',
   'Kanda Awajicho, Chiyoda-ku, Tokyo',
   'active');

-- 3. LINK MACHINES TO CATEGORIES
-- ================================================
-- Get category IDs
WITH cat_ids AS (
  SELECT id, slug FROM categories
)
INSERT INTO machine_categories (machine_id, category_id)
SELECT m.id, c.id
FROM (VALUES
  -- Horror Corner machines
  ('11111111-1111-1111-1111-111111111101', 'weird'),
  ('11111111-1111-1111-1111-111111111101', 'food'),
  ('11111111-1111-1111-1111-111111111102', 'retro'),
  ('11111111-1111-1111-1111-111111111102', 'food'),
  ('11111111-1111-1111-1111-111111111103', 'weird'),
  ('11111111-1111-1111-1111-111111111103', 'food'),
  -- MOGBUG
  ('11111111-1111-1111-1111-111111111104', 'weird'),
  ('11111111-1111-1111-1111-111111111104', 'food'),
  -- King's Treasure
  ('11111111-1111-1111-1111-111111111105', 'weird'),
  ('11111111-1111-1111-1111-111111111105', 'gachapon'),
  -- Seven's Crepe
  ('11111111-1111-1111-1111-111111111106', 'food'),
  -- Milk Stand
  ('11111111-1111-1111-1111-111111111107', 'drinks'),
  ('11111111-1111-1111-1111-111111111107', 'weird'),
  -- Niku no Mansei
  ('11111111-1111-1111-1111-111111111108', 'food'),
  -- AKB48
  ('11111111-1111-1111-1111-111111111109', 'gachapon'),
  -- Gachapon Kaikan
  ('11111111-1111-1111-1111-111111111110', 'gachapon'),
  ('11111111-1111-1111-1111-111111111111', 'gachapon'),
  -- Drink machines
  ('11111111-1111-1111-1111-111111111112', 'drinks'),
  ('11111111-1111-1111-1111-111111111113', 'drinks'),
  ('11111111-1111-1111-1111-111111111114', 'drinks'),
  ('11111111-1111-1111-1111-111111111115', 'drinks'),
  ('11111111-1111-1111-1111-111111111115', 'food'),
  -- Unique machines
  ('11111111-1111-1111-1111-111111111116', 'gachapon'),
  ('11111111-1111-1111-1111-111111111117', 'gachapon'),
  ('11111111-1111-1111-1111-111111111118', 'food'),
  ('11111111-1111-1111-1111-111111111118', 'weird'),
  ('11111111-1111-1111-1111-111111111119', 'weird'),
  ('11111111-1111-1111-1111-111111111120', 'food')
) AS m(id, cat_slug)
JOIN cat_ids c ON c.slug = m.cat_slug
ON CONFLICT DO NOTHING;

-- Done! You should now have 20 machines seeded in Akihabara.
-- Test with: SELECT * FROM nearby_machines(35.6975, 139.7735, 1000);
