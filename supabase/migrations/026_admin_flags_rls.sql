-- Admins can view all flags for moderation
DROP POLICY IF EXISTS "Admins can view all flags" ON flags;
CREATE POLICY "Admins can view all flags"
    ON flags FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins can update flags (resolve/dismiss)
DROP POLICY IF EXISTS "Admins can update flags" ON flags;
CREATE POLICY "Admins can update flags"
    ON flags FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
