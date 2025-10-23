-- Add UPDATE policy for messages table
-- This allows users to update messages in their own conversations
CREATE POLICY "Users can update messages in their conversations" 
ON public.messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1
    FROM conversations
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);