-- Drop the overly permissive policy that allows anyone to see shared conversations
DROP POLICY IF EXISTS "Users can view shared conversations via token" ON public.conversations;

-- Create a more restrictive policy that only allows owners to view their conversations
-- Shared access will be handled separately through the share_token mechanism
CREATE POLICY "Users can only view their own conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Update the messages policy to only allow viewing messages from conversations the user owns
-- or has explicit access to through proper share token validation
DROP POLICY IF EXISTS "Anyone can view messages from shared conversations" ON public.messages;

CREATE POLICY "Users can view messages from their own conversations"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- Note: Shared conversation access via share_token should be handled
-- through a separate service role query or edge function that validates
-- the token before returning data, rather than through RLS policies