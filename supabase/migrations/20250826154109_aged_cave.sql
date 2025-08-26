/*
  # Add user_id column to listings table

  1. Schema Changes
    - Add `user_id` column to `listings` table
    - Column type: uuid (nullable)
    - Foreign key reference to auth.users(id)

  2. Security
    - Update RLS policies to account for user ownership
    - Allow users to manage their own listings

  3. Notes
    - Column is nullable to support anonymous submissions
    - Existing listings will have null user_id (anonymous)
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

-- Update RLS policies to allow users to manage their own listings
DROP POLICY IF EXISTS "Users can update own listings" ON listings;
CREATE POLICY "Users can update own listings"
  ON listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own listings" ON listings;
CREATE POLICY "Users can delete own listings"
  ON listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);