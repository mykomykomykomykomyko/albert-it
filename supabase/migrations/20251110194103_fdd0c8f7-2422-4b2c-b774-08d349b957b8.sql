-- Grant admin access to Mykola
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE email = 'mykola.holovetskyi@gov.ab.ca'
ON CONFLICT DO NOTHING;

-- Create user_temp_passwords table
CREATE TABLE user_temp_passwords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  temp_password_hash TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE
);

-- RLS policies for user_temp_passwords
ALTER TABLE user_temp_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage temp passwords"
  ON user_temp_passwords
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for performance
CREATE INDEX idx_temp_passwords_user_id ON user_temp_passwords(user_id);
CREATE INDEX idx_temp_passwords_used ON user_temp_passwords(used) WHERE used = false;

-- Add password change tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP WITH TIME ZONE;