-- Create access_codes table for registration codes
CREATE TABLE IF NOT EXISTS public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  max_uses integer DEFAULT NULL,
  current_uses integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz DEFAULT NULL
);

-- Enable RLS on access_codes
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active access codes (for validation during signup)
CREATE POLICY "Anyone can view active access codes"
ON public.access_codes FOR SELECT
TO public
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Only admins can manage access codes
CREATE POLICY "Admins can manage access codes"
ON public.access_codes FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert the NOVACAD access code
INSERT INTO public.access_codes (code, description, is_active)
VALUES ('NOVACAD', 'Alberta AI Academy participants access code', true)
ON CONFLICT (code) DO NOTHING;

-- Create function to validate access code
CREATE OR REPLACE FUNCTION public.validate_access_code(code_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.access_codes
    WHERE code = code_input
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
      AND (max_uses IS NULL OR current_uses < max_uses)
  );
END;
$$;

-- Create function to increment access code usage
CREATE OR REPLACE FUNCTION public.increment_access_code_usage(code_input text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.access_codes
  SET current_uses = current_uses + 1
  WHERE code = code_input;
END;
$$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON public.access_codes(code) WHERE is_active = true;