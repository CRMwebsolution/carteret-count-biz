/*
  # Add INSERT policy for users table

  1. Security Changes
    - Add RLS policy to allow authenticated users to insert their own user data
    - This enables the handle_new_user trigger to successfully create user records
    - Maintains security by only allowing users to insert data for their own ID

  2. Problem Solved
    - Fixes issue where new user records weren't being created in public.users table
    - Allows proper role retrieval and authentication state management
    - Enables the application to correctly identify logged-in users
*/

-- Create a policy to allow authenticated users to insert their own user data
CREATE POLICY "Authenticated users can insert their own user data"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);