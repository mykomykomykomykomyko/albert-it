-- Add new columns to agents table for enhanced metadata
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS metadata_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS profile_picture_url text;

-- Update type column to use enum for consistency
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_type') THEN
    CREATE TYPE agent_type AS ENUM ('Text', 'Voice', 'Image', 'Audio', 'Multimodal');
  END IF;
END $$;

-- Alter the type column to use the enum (if it's currently text)
-- First, update any existing values to match enum values
UPDATE public.agents 
SET type = 'Text' 
WHERE type NOT IN ('Text', 'Voice', 'Image', 'Audio', 'Multimodal');

-- Create index for faster filtering by type
CREATE INDEX IF NOT EXISTS idx_agents_type ON public.agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_metadata_tags ON public.agents USING GIN(metadata_tags);