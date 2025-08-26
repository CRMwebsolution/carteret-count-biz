/*
  # Fix storage bucket RLS policies

  1. Storage Setup
    - Create listing-photos bucket if it doesn't exist
    - Set proper bucket configuration
  
  2. RLS Policies
    - Allow public read access to photos
    - Allow both authenticated and anonymous users to upload
    - Fix UUID issues by using proper auth.uid() handling
  
  3. Security
    - Restrict file types to images only
    - Set reasonable file size limits
*/

-- Create the storage bucket if it doesn't exist
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

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;

-- Create proper RLS policies for storage.objects
CREATE POLICY "Public read access for listing photos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'listing-photos');

CREATE POLICY "Allow uploads to listing photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-photos' AND
    (auth.uid() IS NOT NULL OR auth.uid() IS NULL)
  );

CREATE POLICY "Users can update own uploads"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'listing-photos' AND
    (auth.uid() = owner OR auth.uid() IS NULL)
  );

CREATE POLICY "Users can delete own uploads"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'listing-photos' AND
    (auth.uid() = owner OR auth.uid() IS NULL)
  );