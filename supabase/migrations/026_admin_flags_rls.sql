-- Admins can view all flags for moderation
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
CREATE POLICY "Admins can update flags"
    ON flags FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
