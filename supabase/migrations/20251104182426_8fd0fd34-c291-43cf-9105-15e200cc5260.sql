-- Update the SELECT policy on agents table to allow viewing template agents
DROP POLICY IF EXISTS "Users can view their own agents" ON public.agents;

CREATE POLICY "Users can view their own agents" 
ON public.agents 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (visibility = 'published'::text) OR 
  (is_template = true) OR
  ((visibility = 'shared'::text) AND (EXISTS ( 
    SELECT 1
    FROM agent_shares
    WHERE ((agent_shares.agent_id = agents.id) AND (agent_shares.shared_with_user_id = auth.uid()))
  )))
);