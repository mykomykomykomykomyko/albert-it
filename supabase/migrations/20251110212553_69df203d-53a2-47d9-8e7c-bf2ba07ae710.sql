-- Fix shared conversations visibility issue
-- The current policy blocks authenticated users from viewing shared conversations
-- This fixes it to allow both authenticated and unauthenticated users

DROP POLICY IF EXISTS "Users can view shared conversations via token" ON public.conversations;

-- Create a correct policy that allows anyone to view shared conversations
CREATE POLICY "Users can view shared conversations via token"
ON public.conversations
FOR SELECT
TO public
USING (
  -- Conversation belongs to the user
  (auth.uid() = user_id) OR
  -- OR the conversation is shared (accessible to anyone, authenticated or not)
  (is_shared = true)
);