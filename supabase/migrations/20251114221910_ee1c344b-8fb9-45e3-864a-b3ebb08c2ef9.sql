-- Allow admins to delete any prompt
CREATE POLICY "Admins can delete any prompt"
ON public.prompts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));