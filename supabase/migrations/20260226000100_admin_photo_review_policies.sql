-- Allow admins to view all machine_photos (including pending/removed) for moderation.
-- The existing "Active photos are viewable by everyone" policy already covers status='active'.
-- RLS SELECT policies combine with OR, so admins see everything.
CREATE POLICY "Admins can view all photos"
ON machine_photos FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Allow admins to update photo status (approve → 'active', reject → 'removed').
-- The existing "Uploaders can update own photos" policy is unaffected.
CREATE POLICY "Admins can update photo status"
ON machine_photos FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
