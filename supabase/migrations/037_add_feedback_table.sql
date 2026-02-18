-- Create feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index to optimize queries by user_id
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors on re-run
DROP POLICY IF EXISTS "Users can insert own feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON feedback;

-- Users can insert their own feedback (tightened to prevent spoofing)
CREATE POLICY "Users can insert own feedback" ON feedback
    FOR INSERT WITH CHECK (
        (auth.uid() IS NULL AND user_id IS NULL)
        OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    );

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback" ON feedback
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Grant permissions
GRANT INSERT ON feedback TO authenticated, anon;
GRANT SELECT ON feedback TO authenticated;

-- RPC function to submit feedback with rate limiting
CREATE OR REPLACE FUNCTION submit_feedback(
    p_content TEXT,
    p_category TEXT DEFAULT 'general'
)
RETURNS JSON AS $$
BEGIN
    -- Check rate limit: 5 feedback submissions per hour per user/IP
    IF NOT check_rate_limit('submit_feedback', 5, 60) THEN
        RETURN json_build_object('success', false, 'error', 'rate_limit_exceeded');
    END IF;

    -- Basic length validation
    IF length(p_content) > 2000 THEN
        RETURN json_build_object('success', false, 'error', 'content_too_long');
    END IF;

    INSERT INTO feedback (user_id, content, category)
    VALUES (auth.uid(), p_content, p_category);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTE: This table is intended to trigger an Edge Function via a Supabase Database Webhook.
-- Webhooks are configured in the Supabase Dashboard and are not managed by this migration.
