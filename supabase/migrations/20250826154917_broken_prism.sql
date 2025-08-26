/*
  # Set up storage bucket for listing photos

  1. Storage Setup
    - Create `listing-photos` bucket for storing business listing images
    - Enable public access for viewing photos
    - Set up proper file size and type restrictions

  2. Security Policies
    - Allow public read access to photos
    - Allow authenticated and anonymous users to upload photos
    - Restrict file types to images only
    - Set reasonable file size limits
*/

-- Create the listing-photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Allow public read access to listing photos
CREATE POLICY "Public read access for listing photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'listing-photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload listing photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anonymous users to upload photos (for business submissions)
CREATE POLICY "Anonymous users can upload listing photos"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'listing-photos'
  AND octet_length(name) > 0
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own listing photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anonymous deletion for cleanup (temporary uploads)
CREATE POLICY "Allow anonymous deletion for cleanup"
ON storage.objects
FOR DELETE
TO anon
USING (bucket_id = 'listing-photos');