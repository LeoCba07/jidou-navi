-- Fix: Storage upload policy used a direct SELECT on auth.users which the
-- authenticated role cannot access, causing uploads to silently fail.
-- Remove email verification from the policy entirely — it's already enforced
-- by the check_upload_limit RPC before any upload attempt.

DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;

CREATE POLICY "Users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'machine-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
