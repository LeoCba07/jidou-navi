-- Add is_banned flag to profiles and enforce it via RLS on write operations.
-- Banned users are blocked from submitting machines, photos, and visits.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;

-- ================================
-- MACHINES: block banned users from submitting
-- ================================
CREATE POLICY "Banned users cannot submit machines"
ON machines FOR INSERT
WITH CHECK (
    NOT COALESCE(
        (SELECT is_banned FROM profiles WHERE id = auth.uid()),
        FALSE
    )
);

-- ================================
-- MACHINE PHOTOS: block banned users from uploading
-- ================================
CREATE POLICY "Banned users cannot upload photos"
ON machine_photos FOR INSERT
WITH CHECK (
    NOT COALESCE(
        (SELECT is_banned FROM profiles WHERE id = auth.uid()),
        FALSE
    )
);

-- ================================
-- VISITS: block banned users from checking in
-- ================================
CREATE POLICY "Banned users cannot create visits"
ON visits FOR INSERT
WITH CHECK (
    NOT COALESCE(
        (SELECT is_banned FROM profiles WHERE id = auth.uid()),
        FALSE
    )
);
