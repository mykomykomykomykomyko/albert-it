-- Fix overly permissive shared conversations policy
-- The current policy allows ANY authenticated user to see ALL shared conversations
-- This should only allow access via the specific share token, not blanket access

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view shared conversations" ON public.conversations;

-- Create a more restrictive policy that only allows viewing shared conversations
-- when accessed via the share token (unauthenticated access is handled separately)
-- Authenticated users should only see their own conversations
CREATE POLICY "Users can view shared conversations via token"
ON public.conversations
FOR SELECT
USING (
  -- Allow if user owns the conversation
  (auth.uid() = user_id)
  OR
  -- Allow if accessed without auth and has valid share token
  -- (the share token will be validated in the query itself)
  (is_shared = true AND auth.uid() IS NULL)
);