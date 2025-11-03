-- Add sharing columns to conversations table
ALTER TABLE public.conversations
ADD COLUMN share_token uuid,
ADD COLUMN is_shared boolean DEFAULT false;

-- Create index on share_token for fast lookups
CREATE INDEX idx_conversations_share_token ON public.conversations(share_token);

-- Create policy to allow public viewing of shared conversations
CREATE POLICY "Anyone can view shared conversations"
ON public.conversations
FOR SELECT
USING (is_shared = true);

-- Create policy to allow public viewing of messages in shared conversations
CREATE POLICY "Anyone can view messages from shared conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.is_shared = true
  )
);