-- Add email and full_name columns to user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS full_name text;

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, email, full_name)
  VALUES (
    new.id,
    'teacher', -- Default role
    new.email,
    new.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name;
  RETURN new;
END;
$$;

-- Trigger to automatically create user_role entry
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Optional: Function to backfill existing users (Run this manually if needed)
-- This requires access to auth.users which standard RLS prevents, but this function is SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.sync_users_to_roles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, email, full_name, role)
  SELECT 
    id, 
    email, 
    raw_user_meta_data->>'full_name',
    'teacher'
  FROM auth.users
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;
