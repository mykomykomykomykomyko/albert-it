-- Create app_role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create has_role security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Add is_marketplace column to prompts table
ALTER TABLE public.prompts 
ADD COLUMN IF NOT EXISTS is_marketplace boolean DEFAULT false;

-- Create prompt_shares table for sharing prompts between users
CREATE TABLE IF NOT EXISTS public.prompt_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid REFERENCES public.prompts(id) ON DELETE CASCADE NOT NULL,
  shared_with_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_by_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission text CHECK (permission IN ('view', 'edit')) DEFAULT 'view',
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(prompt_id, shared_with_user_id)
);

-- Enable RLS on prompt_shares
ALTER TABLE public.prompt_shares ENABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies for prompt_shares (in case of re-run)
DROP POLICY IF EXISTS "Users can view shares for their prompts or shares with them" ON public.prompt_shares;
DROP POLICY IF EXISTS "Users can create shares for their own prompts" ON public.prompt_shares;
DROP POLICY IF EXISTS "Users can delete shares they created" ON public.prompt_shares;

-- RLS policies for prompt_shares
CREATE POLICY "Users can view shares for their prompts or shares with them"
ON public.prompt_shares FOR SELECT
TO authenticated
USING (
  auth.uid() = shared_by_user_id OR 
  auth.uid() = shared_with_user_id
);

CREATE POLICY "Users can create shares for their own prompts"
ON public.prompt_shares FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = shared_by_user_id AND
  EXISTS (
    SELECT 1 FROM public.prompts 
    WHERE id = prompt_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete shares they created"
ON public.prompt_shares FOR DELETE
TO authenticated
USING (auth.uid() = shared_by_user_id);

-- Drop all existing RLS policies for prompts
DROP POLICY IF EXISTS "Users can view their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can view public prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can view own, shared, and marketplace prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can insert their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can create their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can update their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can update their own prompts or admins can update marketplace" ON public.prompts;
DROP POLICY IF EXISTS "Users can delete their own prompts" ON public.prompts;

-- Update prompts RLS policies to handle marketplace
CREATE POLICY "Users can view own, shared, and marketplace prompts"
ON public.prompts FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  is_marketplace = true OR
  id IN (
    SELECT prompt_id FROM public.prompt_shares 
    WHERE shared_with_user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own prompts"
ON public.prompts FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  (is_marketplace = false OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Users can update their own prompts or admins can update marketplace"
ON public.prompts FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  (is_marketplace = true AND public.has_role(auth.uid(), 'admin'))
)
WITH CHECK (
  user_id = auth.uid() OR
  (is_marketplace = true AND public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Users can delete their own prompts"
ON public.prompts FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prompts_marketplace ON public.prompts(is_marketplace) WHERE is_marketplace = true;
CREATE INDEX IF NOT EXISTS idx_prompt_shares_shared_with ON public.prompt_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);