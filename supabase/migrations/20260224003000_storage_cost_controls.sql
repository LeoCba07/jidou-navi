-- Migration: Storage Cost Controls (Issue #271 - P4)
-- Description: Enforce hard limits on file size and types in Supabase Storage.

-- 1. Update machine-photos bucket: 5MB limit, allowed image types only
UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5MB in bytes
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'machine-photos';

-- 2. Ensure avatars bucket exists and has limits: 2MB limit (avatars should be smaller)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars', 
    'avatars', 
    true, 
    2097152, -- 2MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 3. Endurecer RLS para asegurar que el path empiece con el auth.uid()
-- Esto evita que un usuario suba archivos a carpetas de otros (ahorro de espacio y seguridad)
DROP POLICY IF EXISTS "Users can upload photos" ON storage.objects;
CREATE POLICY "Users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'machine-photos' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);
