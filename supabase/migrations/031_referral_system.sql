-- Migration to add Referral System
-- Issue #188

-- 1. Add referral columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 2. Add Team Hunt Badge
INSERT INTO badges (slug, name, description, trigger_type, trigger_value, rarity, display_order)
VALUES ('team_hunt', 'Team Hunt', 'Referred a friend who visited 3 machines', 'referral_milestone', '{"count": 3}', 'rare', 100)
ON CONFLICT (slug) DO NOTHING;

-- 3. Function to generate a unique short referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger to assign referral code to new users (Internal)
CREATE OR REPLACE FUNCTION handle_new_profile_referral_logic()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_created_referral ON profiles;
CREATE TRIGGER on_profile_created_referral
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_profile_referral_logic();

-- 5. Update the main handle_new_user function to process referral metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID;
    v_ref_code TEXT;
BEGIN
    v_ref_code := NEW.raw_user_meta_data->>'referral_code';
    
    -- Try to find referrer ID from code
    IF v_ref_code IS NOT NULL THEN
        SELECT id INTO v_referrer_id FROM profiles WHERE referral_code = v_ref_code;
    END IF;

    INSERT INTO profiles (id, username, display_name, avatar_url, country, receive_newsletter, referred_by_id)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'username',
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'country',
        COALESCE((NEW.raw_user_meta_data->>'receive_newsletter')::BOOLEAN, FALSE),
        v_referrer_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Update existing profiles with a referral code
UPDATE profiles SET referral_code = generate_referral_code() WHERE referral_code IS NULL;

-- 7. Trigger to handle referral rewards (100 XP to referrer)
CREATE OR REPLACE FUNCTION process_referral_signup_reward()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referred_by_id IS NOT NULL THEN
    -- Award 100 XP to the referrer
    UPDATE profiles 
    SET xp = xp + 100,
        level = floor(0.1 * sqrt(xp + 100)) + 1
    WHERE id = NEW.referred_by_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_referral_signup_reward ON profiles;
CREATE TRIGGER on_referral_signup_reward
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION process_referral_signup_reward();

-- 8. Trigger to check for Team Hunt badge (3 visits)
CREATE OR REPLACE FUNCTION check_team_hunt_badge()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_visit_count INTEGER;
  v_badge_id UUID;
BEGIN
  -- Get referrer of the user who just made a visit
  SELECT referred_by_id INTO v_referrer_id FROM profiles WHERE id = NEW.user_id;

  IF v_referrer_id IS NOT NULL THEN
    -- Count distinct machine visits for this user
    SELECT COUNT(DISTINCT machine_id) INTO v_visit_count FROM visits WHERE user_id = NEW.user_id;

    IF v_visit_count = 3 THEN
      SELECT id INTO v_badge_id FROM badges WHERE slug = 'team_hunt';
      
      -- Award badge to the friend (the one who visited)
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (NEW.user_id, v_badge_id)
      ON CONFLICT DO NOTHING;

      -- Award badge to the referrer
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (v_referrer_id, v_badge_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_visit_team_hunt_check ON visits;
CREATE TRIGGER on_visit_team_hunt_check
  AFTER INSERT ON visits
  FOR EACH ROW
  EXECUTE FUNCTION check_team_hunt_badge();
