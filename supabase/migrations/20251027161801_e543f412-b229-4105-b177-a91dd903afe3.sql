-- Phase 2: Chat & Agent Integration Enhancements

-- Track which agent was used for each message
ALTER TABLE messages ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id);

-- Track default agent for conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS default_agent_id UUID REFERENCES agents(id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_agent_id ON messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_default_agent_id ON conversations(default_agent_id);

-- Add metadata column for transparency data (full payload, request details, etc.)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for metadata queries
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING GIN(metadata);