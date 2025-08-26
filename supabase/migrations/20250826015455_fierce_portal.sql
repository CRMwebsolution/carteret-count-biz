/*
  # Fix RLS policies for listings table

  1. Security Changes
    - Add INSERT policy for anonymous users on listings table
    - Add INSERT policy for anonymous users on photos table
    - Ensure proper RLS policies exist for the add business functionality

  This migration fixes the "new row violates row-level security policy" error
  by allowing anonymous users to insert new listings and photos.
*/

-- Enable RLS on listings table (if not already enabled)
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on photos table (if not already enabled)  
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow anonymous insert on listings" ON listings;
DROP POLICY IF EXISTS "Allow anonymous insert on photos" ON photos;
DROP POLICY IF EXISTS "Allow public read on listings" ON listings;
DROP POLICY IF EXISTS "Allow public read on photos" ON photos;

-- Allow anonymous users to insert new listings
CREATE POLICY "Allow anonymous insert on listings"
  ON listings
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to insert photos for listings
CREATE POLICY "Allow anonymous insert on photos"
  ON photos
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow public read access to active listings
CREATE POLICY "Allow public read on listings"
  ON listings
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active' OR status = 'pending');

-- Allow public read access to photos
CREATE POLICY "Allow public read on photos"
  ON photos
  FOR SELECT
  TO anon, authenticated
  USING (true);