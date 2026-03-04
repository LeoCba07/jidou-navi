-- Fix ALL INSERT policies that use direct SELECT on auth.users.
-- The authenticated role cannot query auth.users, so these policies
-- silently fail. Replace with is_email_verified() SECURITY DEFINER function.

-- saved_machines
DROP POLICY IF EXISTS "Users can save machines" ON saved_machines;
CREATE POLICY "Users can save machines" ON saved_machines FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_email_verified());

DROP POLICY IF EXISTS "Users can unsave machines" ON saved_machines;
CREATE POLICY "Users can unsave machines" ON saved_machines FOR DELETE
USING (auth.uid() = user_id);

-- machine_categories
DROP POLICY IF EXISTS "Auth users can add categories" ON machine_categories;
CREATE POLICY "Auth users can add categories" ON machine_categories FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND public.is_email_verified());

-- machine_photos
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON machine_photos;
CREATE POLICY "Authenticated users can upload photos" ON machine_photos FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND public.is_email_verified());

-- machines
DROP POLICY IF EXISTS "Authenticated users can create machines" ON machines;
CREATE POLICY "Authenticated users can create machines" ON machines FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND public.is_email_verified());

-- visits
DROP POLICY IF EXISTS "Users can create own visits" ON visits;
CREATE POLICY "Users can create own visits" ON visits FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_email_verified());

-- user_badges
DROP POLICY IF EXISTS "Users can earn badges" ON user_badges;
CREATE POLICY "Users can earn badges" ON user_badges FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_email_verified());

-- flags
DROP POLICY IF EXISTS "Users can create flags" ON flags;
CREATE POLICY "Users can create flags" ON flags FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND public.is_email_verified());

-- storage: machine-photos
DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;
CREATE POLICY "Users can upload photos" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'machine-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_email_verified()
);

-- storage: avatars
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_email_verified()
);
