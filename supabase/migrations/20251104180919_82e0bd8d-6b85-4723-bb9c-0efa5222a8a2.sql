-- Add attachments column to messages table to store file information
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance on attachments
CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING GIN (attachments);