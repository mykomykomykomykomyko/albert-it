-- Phase 1.1: Enhanced Agent Management System

-- Add agent sharing and marketplace features to existing agents table
ALTER TABLE public.agents 
ADD COLUMN visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'pending_review', 'published')),
ADD COLUMN submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN reviewer_id UUID REFERENCES auth.users(id),
ADD COLUMN is_template BOOLEAN DEFAULT false,
ADD COLUMN usage_count INTEGER DEFAULT 0,
ADD COLUMN rating DECIMAL(3,2),
ADD COLUMN category TEXT;

-- Agent sharing table
CREATE TABLE public.agent_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(agent_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE public.agent_shares ENABLE ROW LEVEL SECURITY;

-- User roles table for admin permissions
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for agent_shares
CREATE POLICY "Users can view shares where they are recipient"
ON public.agent_shares FOR SELECT
USING (auth.uid() = shared_with_user_id OR auth.uid() = shared_by_user_id);

CREATE POLICY "Users can create shares for their own agents"
ON public.agent_shares FOR INSERT
WITH CHECK (
  auth.uid() = shared_by_user_id AND
  EXISTS (SELECT 1 FROM public.agents WHERE id = agent_shares.agent_id AND user_id = auth.uid())
);

CREATE POLICY "Users can delete shares they created"
ON public.agent_shares FOR DELETE
USING (auth.uid() = shared_by_user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update agents RLS policies to support visibility
DROP POLICY IF EXISTS "Users can view their own agents" ON public.agents;

CREATE POLICY "Users can view their own agents"
ON public.agents FOR SELECT
USING (
  auth.uid() = user_id OR
  visibility = 'published' OR
  (visibility = 'shared' AND EXISTS (
    SELECT 1 FROM public.agent_shares 
    WHERE agent_id = agents.id AND shared_with_user_id = auth.uid()
  ))
);

CREATE POLICY "Admins can view all agents"
ON public.agents FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Phase 1.2: Prompt Library System

CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prompt_text TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.prompt_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  input_variables JSONB,
  output TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prompts
CREATE POLICY "Users can view their own prompts"
ON public.prompts FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own prompts"
ON public.prompts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts"
ON public.prompts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts"
ON public.prompts FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for prompt_executions
CREATE POLICY "Users can view their own executions"
ON public.prompt_executions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own executions"
ON public.prompt_executions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger for updating updated_at on prompts
CREATE TRIGGER update_prompts_updated_at
BEFORE UPDATE ON public.prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 1.3: Framework & Training Resources

CREATE TABLE public.frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.frameworks ENABLE ROW LEVEL SECURITY;

-- RLS Policy for frameworks (public read)
CREATE POLICY "Anyone can view published frameworks"
ON public.frameworks FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can manage frameworks"
ON public.frameworks FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updating updated_at on frameworks
CREATE TRIGGER update_frameworks_updated_at
BEFORE UPDATE ON public.frameworks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample framework data
INSERT INTO public.frameworks (name, description, content, category, order_index) VALUES
('RICECO Framework', 'Role, Instructions, Context, Examples, Constraints, Output', 
'# RICECO Framework

The RICECO framework is a structured approach to crafting effective AI prompts.

## Components

**R - Role**: Define who the AI should act as
**I - Instructions**: Clear, specific directions
**C - Context**: Background information
**E - Examples**: Sample inputs/outputs
**C - Constraints**: Limitations and boundaries
**O - Output**: Desired format and structure

## Example Usage

```
Role: You are an expert data analyst
Instructions: Analyze the following sales data
Context: This is Q4 data from our retail division
Examples: Similar to last quarter''s report
Constraints: Focus only on top 10 products
Output: Provide a summary table and key insights
```', 'best-practices', 1),

('T.R.U.S.T. Framework', 'Task, Requirements, Understanding, Scope, Tone', 
'# T.R.U.S.T. Framework

A framework for building trustworthy AI interactions.

## Components

**T - Task**: What needs to be accomplished
**R - Requirements**: Specific needs and criteria
**U - Understanding**: Verify comprehension
**S - Scope**: Boundaries and limitations
**T - Tone**: Communication style

## Best Practices

- Always clarify the task before proceeding
- List requirements explicitly
- Confirm understanding before execution
- Define clear scope boundaries
- Match tone to context and audience', 'best-practices', 2);