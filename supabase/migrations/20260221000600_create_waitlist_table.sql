-- JidouNavi Waitlist Table
-- For landing page email collection with platform segmentation
-- ================================

-- Waitlist table for pre-launch email collection
CREATE TABLE waitlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    platform TEXT DEFAULT 'unknown',  -- 'ios', 'android', 'desktop'
    source TEXT DEFAULT 'landing',    -- track referral source
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for platform-based queries (for launch day emails)
CREATE INDEX idx_waitlist_platform ON waitlist (platform);

-- RLS: Anyone can insert, no one can read (privacy)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for landing page form
CREATE POLICY "Anyone can join waitlist" ON waitlist
    FOR INSERT WITH CHECK (true);

-- No SELECT policy = no one can read the waitlist via API
-- (You'll export via Supabase dashboard or direct DB access)
