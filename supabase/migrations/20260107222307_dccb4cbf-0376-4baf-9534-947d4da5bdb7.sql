-- V2/V3: Create table for allowed email domains (replaces hardcoded government domains)
CREATE TABLE public.allowed_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE NOT NULL,
  domain_type text NOT NULL CHECK (domain_type IN ('federal', 'provincial', 'municipal', 'approved')),
  requires_access_code boolean DEFAULT false,
  requires_sso boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.allowed_email_domains ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (needed for signup validation)
CREATE POLICY "Anyone can read allowed domains" ON public.allowed_email_domains
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage allowed domains" ON public.allowed_email_domains
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Insert the initial government domains
INSERT INTO public.allowed_email_domains (domain, domain_type, requires_access_code, requires_sso) VALUES
  ('canada.ca', 'federal', false, false),
  ('gc.ca', 'federal', false, false),
  ('gov.ab.ca', 'provincial', false, true),
  ('gov.bc.ca', 'provincial', false, false),
  ('gov.mb.ca', 'provincial', false, false),
  ('leg.gov.mb.ca', 'provincial', false, false),
  ('gnb.ca', 'provincial', false, false),
  ('gov.nl.ca', 'provincial', false, false),
  ('gov.nt.ca', 'provincial', false, false),
  ('novascotia.ca', 'provincial', false, false),
  ('gov.nu.ca', 'provincial', false, false),
  ('ontario.ca', 'provincial', false, false),
  ('gov.pe.ca', 'provincial', false, false),
  ('gouv.qc.ca', 'provincial', false, false),
  ('gov.sk.ca', 'provincial', false, false),
  ('gov.yk.ca', 'provincial', false, false);

-- V4: Create table for blocked disposable email domains
CREATE TABLE public.blocked_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE NOT NULL,
  reason text DEFAULT 'Disposable email provider',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_email_domains ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (needed for signup validation)
CREATE POLICY "Anyone can read blocked domains" ON public.blocked_email_domains
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage blocked domains" ON public.blocked_email_domains
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Insert common disposable email domains
INSERT INTO public.blocked_email_domains (domain, reason) VALUES
  ('mailinator.com', 'Disposable email provider'),
  ('tempmail.com', 'Disposable email provider'),
  ('guerrillamail.com', 'Disposable email provider'),
  ('10minutemail.com', 'Disposable email provider'),
  ('throwaway.email', 'Disposable email provider'),
  ('fakeinbox.com', 'Disposable email provider'),
  ('temp-mail.org', 'Disposable email provider'),
  ('dispostable.com', 'Disposable email provider'),
  ('mailnesia.com', 'Disposable email provider'),
  ('yopmail.com', 'Disposable email provider'),
  ('trashmail.com', 'Disposable email provider'),
  ('getnada.com', 'Disposable email provider'),
  ('sharklasers.com', 'Disposable email provider'),
  ('maildrop.cc', 'Disposable email provider'),
  ('mintemail.com', 'Disposable email provider');

-- V7: Create table for terms of use acceptance
CREATE TABLE public.user_terms_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  terms_version text NOT NULL,
  accepted_at timestamptz DEFAULT now(),
  ip_address text
);

-- Enable RLS
ALTER TABLE public.user_terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Users can read their own acceptance records
CREATE POLICY "Users can read own terms acceptance" ON public.user_terms_acceptance
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own acceptance records  
CREATE POLICY "Users can accept terms" ON public.user_terms_acceptance
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to check if email domain is allowed (bypasses access code)
CREATE OR REPLACE FUNCTION public.is_allowed_email_domain(email_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_domain text;
  is_allowed boolean := false;
BEGIN
  -- Extract domain from email
  email_domain := lower(split_part(email_input, '@', 2));
  
  -- Check if domain or parent domain is in allowed list
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_email_domains
    WHERE is_active = true
    AND (
      email_domain = domain
      OR email_domain LIKE '%.' || domain
    )
  ) INTO is_allowed;
  
  RETURN is_allowed;
END;
$$;

-- Create function to check if email domain is blocked
CREATE OR REPLACE FUNCTION public.is_blocked_email_domain(email_input text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_domain text;
  is_blocked boolean := false;
BEGIN
  -- Extract domain from email
  email_domain := lower(split_part(email_input, '@', 2));
  
  -- Check if domain is in blocked list
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_email_domains
    WHERE is_active = true AND domain = email_domain
  ) INTO is_blocked;
  
  RETURN is_blocked;
END;
$$;

-- Create updated_at trigger for allowed_email_domains
CREATE TRIGGER update_allowed_email_domains_updated_at
  BEFORE UPDATE ON public.allowed_email_domains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();