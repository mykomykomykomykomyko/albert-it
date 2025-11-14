-- Add marketplace workflow columns to prompts table
ALTER TABLE prompts
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'pending_review', 'published', 'rejected')),
ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
ADD COLUMN IF NOT EXISTS reviewer_id uuid,
ADD COLUMN IF NOT EXISTS review_notes text;

-- Update existing prompts to use new visibility system
UPDATE prompts
SET visibility = CASE
  WHEN is_marketplace = true THEN 'published'
  WHEN is_public = true THEN 'published'
  ELSE 'private'
END
WHERE visibility IS NULL OR visibility = 'private';

-- Create index for faster marketplace queries
CREATE INDEX IF NOT EXISTS idx_prompts_visibility ON prompts(visibility);
CREATE INDEX IF NOT EXISTS idx_prompts_submitted_at ON prompts(submitted_at);

-- Update RLS policies for new visibility system
DROP POLICY IF EXISTS "Users can view own, shared, and marketplace prompts" ON prompts;

CREATE POLICY "Users can view own, shared, and published prompts"
ON prompts FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  visibility = 'published' OR
  id IN (
    SELECT prompt_id FROM prompt_shares
    WHERE shared_with_user_id = auth.uid()
  )
);

-- Add policy for admins to view all prompts including pending review
CREATE POLICY "Admins can view all prompts"
ON prompts FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Update policy for admins to manage marketplace prompts
DROP POLICY IF EXISTS "Users can update their own prompts or admins can update marketp" ON prompts;

CREATE POLICY "Users can update their own prompts or admins can review"
ON prompts FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  has_role(auth.uid(), 'admin')
)
WITH CHECK (
  user_id = auth.uid() OR
  has_role(auth.uid(), 'admin')
);