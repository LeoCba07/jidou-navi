-- Create feedback table
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

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
