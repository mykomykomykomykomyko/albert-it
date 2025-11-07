-- Create storage bucket for translation files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('translations', 'translations', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for translations bucket
-- Only admins can upload translations
CREATE POLICY "Admins can upload translations"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'translations' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Only admins can view translations
CREATE POLICY "Admins can view translations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'translations'
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Only admins can delete translations
CREATE POLICY "Admins can delete translations"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'translations'
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);