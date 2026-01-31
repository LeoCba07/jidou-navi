-- Add XP and Level to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Function to increment XP and update Level automatically
-- Returns the new XP and Level
CREATE OR REPLACE FUNCTION increment_xp(xp_to_add INT)
RETURNS TABLE (new_xp INT, new_level INT) AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Validation
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF xp_to_add <= 0 THEN
    RAISE EXCEPTION 'XP amount must be positive';
  END IF;

  -- Safety limit to prevent abuse
  IF xp_to_add > 1000 THEN
    RAISE EXCEPTION 'XP amount must not exceed 1000 per call';
  END IF;

  -- Atomic Update and Return
  -- Level formula: Level = floor(0.1 * sqrt(xp)) + 1
  RETURN QUERY
  UPDATE profiles 
  SET 
    xp = COALESCE(xp, 0) + xp_to_add,
    level = FLOOR(0.1 * SQRT(COALESCE(xp, 0) + xp_to_add)) + 1
  WHERE id = current_user_id
  RETURNING profiles.xp, profiles.level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
