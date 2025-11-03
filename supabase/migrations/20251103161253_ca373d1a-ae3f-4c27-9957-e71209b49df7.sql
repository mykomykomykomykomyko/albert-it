-- Create a security definer function to look up user ID by email
-- This bypasses RLS to allow users to share agents with others
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE email = _email LIMIT 1;
$$;