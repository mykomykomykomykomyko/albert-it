-- Add knowledge_documents column to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS knowledge_documents JSONB DEFAULT '[]'::jsonb;

-- Create storage bucket for agent documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-documents', 'agent-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for agent-documents bucket
CREATE POLICY "Users can view their own agent documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'agent-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload their own agent documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'agent-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own agent documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'agent-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own agent documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'agent-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);