-- Phase 3: Workflow & Canvas Enhancements

-- Workflow sharing table
CREATE TABLE IF NOT EXISTS workflow_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission TEXT DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'execute')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workflow_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE workflow_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_shares
CREATE POLICY "Users can create shares for their workflows"
  ON workflow_shares FOR INSERT
  WITH CHECK (
    auth.uid() = shared_by_user_id AND
    EXISTS (
      SELECT 1 FROM workflows
      WHERE workflows.id = workflow_shares.workflow_id
      AND workflows.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view shares where they are involved"
  ON workflow_shares FOR SELECT
  USING (
    auth.uid() = shared_with_user_id OR
    auth.uid() = shared_by_user_id
  );

CREATE POLICY "Users can delete shares they created"
  ON workflow_shares FOR DELETE
  USING (auth.uid() = shared_by_user_id);

-- Add workflow visibility and versioning
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public'));
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS parent_workflow_id UUID REFERENCES workflows(id);
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS category TEXT;

-- Workflow execution logs table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_executions
CREATE POLICY "Users can create their own executions"
  ON workflow_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own executions"
  ON workflow_executions FOR SELECT
  USING (auth.uid() = user_id);

-- Update RLS policies for workflows to include shared workflows
DROP POLICY IF EXISTS "Users can view their own workflows" ON workflows;

CREATE POLICY "Users can view their own and shared workflows"
  ON workflows FOR SELECT
  USING (
    auth.uid() = user_id OR
    visibility = 'public' OR
    (visibility = 'shared' AND EXISTS (
      SELECT 1 FROM workflow_shares
      WHERE workflow_shares.workflow_id = workflows.id
      AND workflow_shares.shared_with_user_id = auth.uid()
    ))
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_workflow_shares_workflow_id ON workflow_shares(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_shares_shared_with ON workflow_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON workflow_executions(user_id);

-- Enable realtime for collaborative editing
ALTER PUBLICATION supabase_realtime ADD TABLE workflows;
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_shares;