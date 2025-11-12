DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'agents' 
      AND policyname = 'Admins can update any agent'
  ) THEN
    CREATE POLICY "Admins can update any agent"
    ON public.agents
    FOR UPDATE
    USING (has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;