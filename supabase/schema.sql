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
          AND visited_at >= NOW() - INTERVAL '7 days'
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

-- SERVER-SIDE VISIT CREATION
-- Prevents cheating by calculating distance on server
-- ================================
CREATE OR REPLACE FUNCTION create_visit(
    p_machine_id UUID,
    p_user_lat DOUBLE PRECISION,
    p_user_lng DOUBLE PRECISION,
    p_still_exists BOOLEAN DEFAULT NULL,
    p_max_distance_meters INTEGER DEFAULT 100
)
RETURNS visits AS $$
DECLARE
    v_distance DOUBLE PRECISION;
    v_visit visits;
BEGIN
    -- Calculate real distance server-side
    SELECT ST_Distance(
        location,
        ST_MakePoint(p_user_lng, p_user_lat)::geography
    ) INTO v_distance
    FROM machines WHERE id = p_machine_id;

    -- Reject if machine doesn't exist
    IF v_distance IS NULL THEN
        RAISE EXCEPTION 'Machine not found';
    END IF;

    -- Reject if too far
    IF v_distance > p_max_distance_meters THEN
        RAISE EXCEPTION 'Too far from machine to check in (% meters)', ROUND(v_distance::numeric, 1);
    END IF;

    -- Create the visit
    INSERT INTO visits (user_id, machine_id, checkin_location, distance_meters, still_exists)
    VALUES (
        auth.uid(),
        p_machine_id,
        ST_MakePoint(p_user_lng, p_user_lat)::geography,
        v_distance,
        p_still_exists
    )
    RETURNING * INTO v_visit;

    RETURN v_visit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. TRIGGERS
-- ================================

CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_machines_updated_at
    BEFORE UPDATE ON machines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_machines_lat_lng
    BEFORE INSERT OR UPDATE OF location ON machines
    FOR EACH ROW EXECUTE FUNCTION set_machine_lat_lng();

CREATE TRIGGER trigger_machines_profile_count
    AFTER INSERT OR DELETE ON machines
    FOR EACH ROW EXECUTE FUNCTION update_profile_counts();

CREATE TRIGGER trigger_visits_profile_count
    AFTER INSERT OR DELETE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_profile_counts();

CREATE TRIGGER trigger_badges_profile_count
    AFTER INSERT OR DELETE ON user_badges
    FOR EACH ROW EXECUTE FUNCTION update_profile_counts();

CREATE TRIGGER trigger_visits_machine_count
    AFTER INSERT OR DELETE ON visits
    FOR EACH ROW EXECUTE FUNCTION update_machine_counts();

CREATE TRIGGER trigger_photos_machine_count
    AFTER INSERT OR DELETE ON machine_photos
    FOR EACH ROW EXECUTE FUNCTION update_machine_counts();

CREATE TRIGGER trigger_flags_machine_count
    AFTER INSERT ON flags
    FOR EACH ROW EXECUTE FUNCTION update_machine_counts();

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 7. ROW LEVEL SECURITY (RLS)
-- ================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can create own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Categories
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

-- Machines
CREATE POLICY "Active machines are viewable by everyone" ON machines FOR SELECT USING (status = 'active');
CREATE POLICY "Contributors can view own pending machines" ON machines FOR SELECT USING (auth.uid() = contributor_id);
CREATE POLICY "Authenticated users can create machines" ON machines FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Contributors can update own machines" ON machines FOR UPDATE USING (auth.uid() = contributor_id);

-- Machine Categories
CREATE POLICY "Machine categories viewable by everyone" ON machine_categories FOR SELECT USING (true);
CREATE POLICY "Auth users can add categories" ON machine_categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Machine Photos (updated for soft delete)
CREATE POLICY "Active photos are viewable by everyone" ON machine_photos FOR SELECT USING (status = 'active');
CREATE POLICY "Authenticated users can upload photos" ON machine_photos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Uploaders can update own photos" ON machine_photos FOR UPDATE USING (auth.uid() = uploaded_by);

-- Visits
CREATE POLICY "Visits are viewable by authenticated users" ON visits FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create own visits" ON visits FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Saved Machines
CREATE POLICY "Users can view own saved" ON saved_machines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save machines" ON saved_machines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave machines" ON saved_machines FOR DELETE USING (auth.uid() = user_id);

-- Badges
CREATE POLICY "Badges are viewable by everyone" ON badges FOR SELECT USING (true);

-- User Badges
CREATE POLICY "User badges are viewable by everyone" ON user_badges FOR SELECT USING (true);
CREATE POLICY "Users can earn badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Flags
CREATE POLICY "Users can view own flags" ON flags FOR SELECT USING (auth.uid() = reported_by);
CREATE POLICY "Users can create flags" ON flags FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins can view all flags" ON flags FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can update flags" ON flags FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 8. SEED DATA
-- ================================

INSERT INTO categories (slug, name, description, icon_name, color, display_order) VALUES
    ('eats', 'Eats', 'Food, drinks, snacks, treats, and alcohol', 'utensils', '#FF4B4B', 1),
    ('gachapon', 'Gachapon', 'Capsule toy machines', 'dice', '#FFB7CE', 2),
    ('weird', 'Weird', 'Unusual and bizarre finds', 'ghost', '#9B59B6', 3),
    ('retro', 'Retro', 'Vintage and nostalgic machines', 'gamepad', '#FFD966', 4),
    ('local-gems', 'Local Gems', 'Local specialties and craft products', 'sparkles', '#2ECC71', 5);

INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order) VALUES
    -- Visit milestones
    ('first_find', 'First Find', 'Visit your first vending machine', 'visit_count', '{"count": 1}', 'common', 1),
    ('explorer_5', 'Explorer', 'Visit 5 different machines', 'visit_count', '{"count": 5}', 'common', 2),
    ('adventurer_25', 'Adventurer', 'Visit 25 different machines', 'visit_count', '{"count": 25}', 'rare', 3),
    ('urban_forager', 'Urban Forager', 'The streets are your supermarket', 'visit_count', '{"count": 50}', 'rare', 4),
    ('master_100', 'Vending Master', 'Visit 100 different machines', 'visit_count', '{"count": 100}', 'epic', 5),
    ('vending_sensei', 'Vending Sensei', 'You have mastered the art of the machine', 'visit_count', '{"count": 250}', 'epic', 6),
    ('legend', 'Legend of Jidouhanbaiki', 'Your name echoes through vending history', 'visit_count', '{"count": 500}', 'legendary', 7),

    -- Contribution milestones
    ('first_contribution', 'Contributor', 'Add your first machine to the map', 'contribution_count', '{"count": 1}', 'common', 10),
    ('spotter', 'Spotter', 'Your eyes are trained', 'contribution_count', '{"count": 5}', 'common', 11),
    ('cartographer_10', 'Cartographer', 'Add 10 machines to the map', 'contribution_count', '{"count": 10}', 'rare', 12),
    ('pathfinder', 'Pathfinder', 'Building the map, one pin at a time', 'contribution_count', '{"count": 25}', 'rare', 13),
    ('archaeologist', 'Vending Archaeologist', 'Unearthing hidden treasures', 'contribution_count', '{"count": 50}', 'epic', 14),
    ('legendary_mapper', 'Legendary Mapper', 'The community owes you a Pocari Sweat', 'contribution_count', '{"count": 100}', 'legendary', 15),

    -- Category specialist badges
    ('weird_hunter', 'Weird Hunter', 'Visit 5 machines tagged as Weird', 'category_visit', '{"category": "weird", "count": 5}', 'rare', 20),
    ('oddity_collector', 'Oddity Collector', 'Seeker of the strange', 'category_visit', '{"category": "weird", "count": 10}', 'epic', 21),
    ('gachapon_addict', 'Gachapon Addict', 'Visit 10 gachapon machines', 'category_visit', '{"category": "gachapon", "count": 10}', 'rare', 22),
    ('capsule_commander', 'Capsule Commander', 'The gacha gods smile upon you', 'category_visit', '{"category": "gachapon", "count": 25}', 'epic', 23),
    ('retro_lover', 'Retro Lover', 'Visit 5 retro machines', 'category_visit', '{"category": "retro", "count": 5}', 'rare', 24),
    ('time_traveler', 'Time Traveler', 'Living in the Showa era', 'category_visit', '{"category": "retro", "count": 10}', 'epic', 25),
    ('caffeine_addict', 'Caffeine Addict', 'Running on liquid courage', 'category_visit', '{"category": "coffee", "count": 10}', 'rare', 26),
    ('thirst_quencher', 'Thirst Quencher', 'Hydration is your mission', 'category_visit', '{"category": "drinks", "count": 15}', 'common', 27),
    ('frozen_explorer', 'Frozen Explorer', 'Brain freeze champion', 'category_visit', '{"category": "ice-cream", "count": 5}', 'rare', 28),
    ('liquid_courage', 'Liquid Courage', 'Found the good stuff', 'category_visit', '{"category": "alcohol", "count": 5}', 'rare', 29),
    ('snack_attack', 'Snack Attack', 'Fueled by vending cuisine', 'category_visit', '{"category": "food", "count": 10}', 'rare', 30),

    -- Verification badges
    ('verifier', 'Verifier', 'Verify 10 machines still exist', 'verification_count', '{"count": 10}', 'common', 40),
    ('truth_seeker', 'Truth Seeker', 'Keeping the map honest', 'verification_count', '{"count": 5}', 'common', 41),
    ('fact_checker', 'Fact Checker', 'Guardian of accuracy', 'verification_count', '{"count": 25}', 'rare', 42),
    ('data_integrity', 'Data Integrity Officer', 'The database thanks you', 'verification_count', '{"count": 50}', 'epic', 43);

-- 9. HELPER VIEWS
-- ================================

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

-- 10. HELPER FUNCTIONS
-- ================================

-- ================================
-- NEARBY MACHINES WITH CURSOR PAGINATION
-- ================================
CREATE OR REPLACE FUNCTION nearby_machines(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 1000,
    category_slug VARCHAR DEFAULT NULL,
    limit_count INTEGER DEFAULT 50,
    cursor_distance DOUBLE PRECISION DEFAULT NULL,
    cursor_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    status machine_status,
    visit_count INTEGER,
    verification_count INTEGER,
    primary_photo_url TEXT,
    categories JSON,
    directions_hint TEXT,
    last_verified_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.name,
        m.description,
        m.address,
        m.latitude,
        m.longitude,
        ST_Distance(m.location, ST_MakePoint(lng, lat)::geography) as distance_meters,
        m.status,
        m.visit_count,
        m.verification_count,
        mp.photo_url as primary_photo_url,
        COALESCE(
            (SELECT json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'color', c.color))
            FROM machine_categories mc
            JOIN categories c ON c.id = mc.category_id
            WHERE mc.machine_id = m.id),
            '[]'::json
        ) as categories,
        m.directions_hint,
        m.last_verified_at
    FROM machines m
    LEFT JOIN machine_photos mp ON mp.machine_id = m.id AND mp.is_primary = TRUE AND mp.status = 'active'
    LEFT JOIN machine_categories mc ON mc.machine_id = m.id
    LEFT JOIN categories c ON c.id = mc.category_id
    WHERE m.status = 'active'
        AND ST_DWithin(m.location, ST_MakePoint(lng, lat)::geography, radius_meters)
        AND (category_slug IS NULL OR c.slug = category_slug)
        -- Cursor-based pagination
        AND (
            cursor_distance IS NULL
            OR ST_Distance(m.location, ST_MakePoint(lng, lat)::geography) > cursor_distance
            OR (
                ST_Distance(m.location, ST_MakePoint(lng, lat)::geography) = cursor_distance
                AND m.id > cursor_id
            )
        )
    GROUP BY m.id, m.name, m.description, m.address, m.latitude, m.longitude, m.location, m.status, m.visit_count, mp.photo_url, m.directions_hint, m.last_verified_at
    ORDER BY ST_Distance(m.location, ST_MakePoint(lng, lat)::geography), m.id
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Search machines by text
CREATE OR REPLACE FUNCTION search_machines(
    search_term TEXT,
    limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status machine_status,
    visit_count INTEGER,
    similarity_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.name,
        m.description,
        m.address,
        m.latitude,
        m.longitude,
        m.status,
        m.visit_count,
        GREATEST(
            COALESCE(similarity(m.name, search_term), 0),
            COALESCE(similarity(m.description, search_term), 0)
        ) as similarity_score
    FROM machines m
    WHERE m.status = 'active'
        AND (
            m.name % search_term
            OR m.description % search_term
        )
    ORDER BY similarity_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Weekly leaderboard
CREATE OR REPLACE FUNCTION weekly_leaderboard(
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    user_id UUID,
    username VARCHAR,
    display_name VARCHAR,
    avatar_url TEXT,
    visits_this_week BIGINT,
    contributions_this_week BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id as user_id,
        p.username,
        p.display_name,
        p.avatar_url,
        COUNT(DISTINCT v.id) as visits_this_week,
        COUNT(DISTINCT m.id) as contributions_this_week
    FROM profiles p
    LEFT JOIN visits v ON v.user_id = p.id AND v.visited_at >= NOW() - INTERVAL '7 days'
    LEFT JOIN machines m ON m.contributor_id = p.id AND m.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY p.id, p.username, p.display_name, p.avatar_url
    HAVING COUNT(DISTINCT v.id) > 0 OR COUNT(DISTINCT m.id) > 0
    ORDER BY visits_this_week DESC, contributions_this_week DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Approve machine
CREATE OR REPLACE FUNCTION approve_machine(
    machine_id UUID,
    reviewer_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE machines
    SET
        status = 'active',
        reviewed_at = NOW(),
        reviewed_by = reviewer_id
    WHERE id = machine_id AND status = 'pending';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- SOFT DELETE PHOTO
-- ================================
CREATE OR REPLACE FUNCTION remove_photo(
    p_photo_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE machine_photos
    SET status = 'removed'
    WHERE id = p_photo_id
        AND (
            uploaded_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'admin'
            )
        );

    -- Update machine photo count
    IF FOUND THEN
        UPDATE machines m
        SET photo_count = (
            SELECT COUNT(*) FROM machine_photos mp
            WHERE mp.machine_id = m.id AND mp.status = 'active'
        )
        FROM machine_photos mp
        WHERE mp.id = p_photo_id AND m.id = mp.machine_id;
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- MACHINES IN BOUNDS (for map viewport queries)
-- ================================
CREATE OR REPLACE FUNCTION machines_in_bounds(
    min_lat DOUBLE PRECISION,
    max_lat DOUBLE PRECISION,
    min_lng DOUBLE PRECISION,
    max_lng DOUBLE PRECISION,
    limit_count INTEGER DEFAULT 200
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    status machine_status,
    visit_count INTEGER,
    verification_count INTEGER,
    primary_photo_url TEXT,
    categories JSON,
    directions_hint TEXT,
    last_verified_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.name,
        m.description,
        m.address,
        m.latitude,
        m.longitude,
        0::DOUBLE PRECISION as distance_meters,
        m.status,
        m.visit_count,
        m.verification_count,
        mp.photo_url as primary_photo_url,
        COALESCE(
            (SELECT json_agg(json_build_object('id', c.id, 'slug', c.slug, 'name', c.name, 'color', c.color))
            FROM machine_categories mc
            JOIN categories c ON c.id = mc.category_id
            WHERE mc.machine_id = m.id),
            '[]'::json
        ) as categories,
        m.directions_hint,
        m.last_verified_at
    FROM machines m
    LEFT JOIN machine_photos mp ON mp.machine_id = m.id AND mp.is_primary = TRUE AND mp.status = 'active'
    WHERE m.status = 'active'
        AND m.latitude >= min_lat
        AND m.latitude <= max_lat
        AND m.longitude >= min_lng
        AND m.longitude <= max_lng
    ORDER BY m.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
