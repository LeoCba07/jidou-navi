-- Migration: Fix email verification RLS policies
-- The email_verification_enforcement migration used direct SELECT on auth.users
-- in RLS policies, but the `authenticated` role doesn't have SELECT permission
-- on auth.users. This caused all policies with that check to silently fail,
-- blocking uploads, machine creation, visits, etc.
-- Fix: use a SECURITY DEFINER function that can access auth.users.

-- 1. Create helper function
CREATE OR REPLACE FUNCTION public.is_email_verified()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT email_confirmed_at IS NOT NULL
  FROM auth.users
  WHERE id = auth.uid()
$$;

-- 2. Fix storage policies
DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;
CREATE POLICY "Users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'machine-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_email_verified()
);

DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_email_verified()
);

-- 3. Fix table policies
DROP POLICY IF EXISTS "Authenticated users can create machines" ON machines;
CREATE POLICY "Authenticated users can create machines"
ON machines FOR INSERT TO authenticated
WITH CHECK (auth.role() = 'authenticated' AND public.is_email_verified());

DROP POLICY IF EXISTS "Users can create own visits" ON visits;
CREATE POLICY "Users can create own visits"
ON visits FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_email_verified());

DROP POLICY IF EXISTS "Users can save machines" ON saved_machines;
CREATE POLICY "Users can save machines"
ON saved_machines FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_email_verified());

DROP POLICY IF EXISTS "Users can unsave machines" ON saved_machines;
CREATE POLICY "Users can unsave machines"
ON saved_machines FOR DELETE TO authenticated
USING (auth.uid() = user_id AND public.is_email_verified());

DROP POLICY IF EXISTS "Auth users can add categories" ON machine_categories;
CREATE POLICY "Auth users can add categories"
ON machine_categories FOR INSERT TO authenticated
WITH CHECK (auth.role() = 'authenticated' AND public.is_email_verified());

DROP POLICY IF EXISTS "Authenticated users can upload photos" ON machine_photos;
CREATE POLICY "Authenticated users can upload photos"
ON machine_photos FOR INSERT TO authenticated
WITH CHECK (auth.role() = 'authenticated' AND public.is_email_verified());

DROP POLICY IF EXISTS "Users can earn badges" ON user_badges;
CREATE POLICY "Users can earn badges"
ON user_badges FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_email_verified());

DROP POLICY IF EXISTS "Users can create flags" ON flags;
CREATE POLICY "Users can create flags"
ON flags FOR INSERT TO authenticated
WITH CHECK (auth.role() = 'authenticated' AND public.is_email_verified());

-- 4. Clean up dashboard-generated anon policy (too permissive, no auth check)
DROP POLICY IF EXISTS "Allow uploads 1wey2tj_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow reads 1wey2tj_0" ON storage.objects;
