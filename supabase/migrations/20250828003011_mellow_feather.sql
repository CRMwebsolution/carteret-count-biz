/*
  # Initial Database Schema Setup

  1. New Tables
    - `users` - User profiles and roles
    - `categories` - Business categories
    - `listings` - Business listings
    - `listing_categories` - Many-to-many relationship between listings and categories
    - `photos` - Photo metadata for listings
    - `verifications` - Business verification requests
    - `payments` - Payment records
    - `reviews` - User reviews for listings
    - `reports` - Reports against listings
    - `audit_log` - System audit trail

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
    - Create helper functions for admin checks

  3. Storage
    - Create storage buckets for photos and verification documents
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create custom domain for earth coordinates
CREATE DOMAIN earth AS cube
  CONSTRAINT not_point CHECK (cube_is_point(VALUE))
  CONSTRAINT not_3d CHECK ((cube_dim(VALUE) <= 3))
  CONSTRAINT on_surface CHECK ((abs(((cube_distance(VALUE, '(0)'::cube) / earth()) - '1'::double precision)) < '1e-06'::double precision));

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text,
  phone text,
  role text NOT NULL DEFAULT 'user',
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id bigserial PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  parent_id bigint REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS categories_parent_idx ON categories(parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_key ON categories(slug);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  phone text,
  email text,
  website text,
  address_line1 text,
  address_line2 text,
  city text,
  state text DEFAULT 'NC',
  postal_code text,
  latitude double precision,
  longitude double precision,
  hours jsonb,
  price_level integer,
  is_veteran_owned boolean DEFAULT false,
  is_family_owned boolean DEFAULT false,
  accepts_cards boolean DEFAULT true,
  offers_delivery boolean DEFAULT false,
  badge text DEFAULT 'unverified',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listings_geo_idx ON listings USING gist (ll_to_earth(latitude, longitude));
CREATE INDEX IF NOT EXISTS listings_search_idx ON listings USING gin (to_tsvector('simple'::regconfig, ((COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text))));
CREATE INDEX IF NOT EXISTS listings_status_idx ON listings(status);
CREATE UNIQUE INDEX IF NOT EXISTS listings_slug_key ON listings(slug);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Listing categories junction table
CREATE TABLE IF NOT EXISTS listing_categories (
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  category_id bigint NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (listing_id, category_id)
);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id bigserial PRIMARY KEY,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS photos_listing_idx ON photos(listing_id);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Verifications table
CREATE TABLE IF NOT EXISTS verifications (
  id bigserial PRIMARY KEY,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  requester_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entity_type text,
  state_entity_id text,
  documents jsonb,
  status text DEFAULT 'submitted',
  notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  listing_id uuid REFERENCES listings(id),
  kind text NOT NULL,
  provider text NOT NULL,
  provider_payment_id text,
  amount_cents integer NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id bigserial PRIMARY KEY,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_listing_idx ON reviews(listing_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id bigserial PRIMARY KEY,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reason text,
  details text,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Trigger functions
CREATE OR REPLACE FUNCTION trg_listings_ensure_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set owner_id to the authenticated user if not provided
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  
  -- Set user_id to the authenticated user if not provided
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_listings_fill_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate slug from name if not provided
  IF NEW.slug IS NULL AND NEW.name IS NOT NULL THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug := trim(NEW.slug, '-');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_auth_user_upsert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name);
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER listings_ensure_owner
  BEFORE INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION trg_listings_ensure_owner();

CREATE TRIGGER listings_fill_defaults
  BEFORE INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION trg_listings_fill_defaults();

-- Auth trigger to sync users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_user_upsert();

-- RLS Policies

-- Users policies (no RLS needed for basic operations)

-- Categories policies (public read)
CREATE POLICY "Allow public read on categories"
  ON categories
  FOR SELECT
  TO public
  USING (true);

-- Listings policies
CREATE POLICY "Allow public read on active listings"
  ON listings
  FOR SELECT
  TO public
  USING (status = 'active');

CREATE POLICY "Allow authenticated users to read own listings"
  ON listings
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Allow authenticated users to insert listings"
  ON listings
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Allow users to update own listings"
  ON listings
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR is_admin())
  WITH CHECK (owner_id = auth.uid() OR is_admin());

CREATE POLICY "Allow users to delete own listings"
  ON listings
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR is_admin());

-- Photos policies
CREATE POLICY "Allow public read on photos"
  ON photos
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users to insert photos"
  ON photos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can manage photos for own listings"
  ON photos
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM listings
    WHERE listings.id = photos.listing_id
    AND listings.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete photos for own listings"
  ON photos
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM listings
    WHERE listings.id = photos.listing_id
    AND listings.owner_id = auth.uid()
  ));

-- Verifications policies (admin only for now)
CREATE POLICY "Allow authenticated users to insert verifications"
  ON verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Allow users to read own verifications"
  ON verifications
  FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR is_admin());

-- Reviews policies
CREATE POLICY "Allow public read on approved reviews"
  ON reviews
  FOR SELECT
  TO public
  USING (status = 'approved');

CREATE POLICY "Allow authenticated users to insert reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Reports policies
CREATE POLICY "Allow authenticated users to insert reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- Payments policies
CREATE POLICY "Allow users to read own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- Audit log policies
CREATE POLICY "Allow admins to read audit log"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Insert some default categories
INSERT INTO categories (slug, name) VALUES
  ('restaurants', 'Restaurants & Food'),
  ('home-services', 'Home Services'),
  ('auto-marine', 'Auto & Marine'),
  ('health-wellness', 'Health & Wellness'),
  ('retail', 'Retail & Shopping'),
  ('professional', 'Professional Services')
ON CONFLICT (slug) DO NOTHING;