-- Add XP and Level to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Function to increment XP and update Level automatically
CREATE OR REPLACE FUNCTION increment_xp(xp_to_add INT)
RETURNS VOID AS $$
DECLARE
  current_xp INT;
  new_xp INT;
  new_level INT;
BEGIN
  -- Get current XP
  SELECT xp INTO current_xp FROM profiles WHERE id = auth.uid();
  
  -- Handle nulls
  IF current_xp IS NULL THEN current_xp := 0; END IF;
  
  -- Calculate new XP
  new_xp := current_xp + xp_to_add;
  
  -- Calculate new Level based on formula: Level = floor(0.1 * sqrt(xp)) + 1
  -- Level 1: 0-99 XP
  -- Level 2: 100-399 XP
  -- Level 3: 400-899 XP
  -- Level 10: 8100 XP
  new_level := FLOOR(0.1 * SQRT(new_xp)) + 1;
  
  -- Update profile
  UPDATE profiles 
  SET xp = new_xp, 
      level = new_level 
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
