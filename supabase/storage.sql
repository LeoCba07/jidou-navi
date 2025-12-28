-- Storage bucket for machine photos
-- Already ran in Supabase SQL Editor (only once)

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('machine-photos', 'machine-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'machine-photos');

-- Allow anyone to view photos (public bucket)
CREATE POLICY "Anyone can view photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'machine-photos');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'machine-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
