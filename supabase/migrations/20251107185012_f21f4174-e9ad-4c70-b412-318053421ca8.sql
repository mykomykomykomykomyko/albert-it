-- Create file_attachments table to store all uploaded files
CREATE TABLE IF NOT EXISTS public.file_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  storage_path TEXT,
  thumbnail_url TEXT,
  data_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for file attachments
CREATE POLICY "Users can view their own file attachments"
ON public.file_attachments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own file attachments"
ON public.file_attachments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own file attachments"
ON public.file_attachments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own file attachments"
ON public.file_attachments
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_file_attachments_user_id ON public.file_attachments(user_id);
CREATE INDEX idx_file_attachments_conversation_id ON public.file_attachments(conversation_id);
CREATE INDEX idx_file_attachments_created_at ON public.file_attachments(created_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_file_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_file_attachments_updated_at
BEFORE UPDATE ON public.file_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_file_attachments_updated_at();