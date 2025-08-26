/*
  # Set up authentication and user management

  1. Security Changes
    - Update RLS policies to work with authenticated users
    - Add user_id column to listings table to associate listings with users
    - Create policies for authenticated users to manage their own listings

  2. Schema Changes
    - Add user_id column to listings table
    - Add foreign key constraint to auth.users
    - Update existing policies to support user ownership
*/

-- Add user_id column to listings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'listings' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE listings ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Update RLS policies for listings table
DROP POLICY IF EXISTS "Allow anonymous insert on listings" ON listings;
DROP POLICY IF EXISTS "Allow public read on listings" ON listings;
DROP POLICY IF EXISTS "Users can manage own listings" ON listings;

-- Allow both anonymous and authenticated users to insert listings
CREATE POLICY "Allow insert on listings"
  ON listings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow public read access to active listings
CREATE POLICY "Allow public read on listings"
  ON listings
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active' OR status = 'pending');

-- Allow authenticated users to update their own listings
CREATE POLICY "Users can update own listings"
  ON listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own listings
CREATE POLICY "Users can delete own listings"
  ON listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Update photos table policies to work with user ownership
DROP POLICY IF EXISTS "Allow anonymous insert on photos" ON photos;
DROP POLICY IF EXISTS "Allow public read on photos" ON photos;

-- Allow insert on photos (both anonymous and authenticated)
CREATE POLICY "Allow insert on photos"
  ON photos
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow public read access to photos
CREATE POLICY "Allow public read on photos"
  ON photos
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated users to manage photos for their listings
CREATE POLICY "Users can manage photos for own listings"
  ON photos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE listings.id = photos.listing_id 
      AND listings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photos for own listings"
  ON photos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listings 
      WHERE listings.id = photos.listing_id 
      AND listings.user_id = auth.uid()
    )
  );