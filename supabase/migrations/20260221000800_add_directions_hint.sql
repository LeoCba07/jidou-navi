-- Add directions_hint column to machines table
-- This allows users to provide helpful tips for finding the machine

ALTER TABLE machines
ADD COLUMN IF NOT EXISTS directions_hint TEXT;

-- Add a comment for documentation
COMMENT ON COLUMN machines.directions_hint IS 'Optional hint for finding the machine (e.g., "Inside train station", "Behind 7-Eleven")';
