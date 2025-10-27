-- Create meeting_transcripts table for storing and analyzing Teams meeting transcripts
CREATE TABLE public.meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  meeting_date TIMESTAMP WITH TIME ZONE,
  original_filename TEXT NOT NULL,
  file_format TEXT CHECK (file_format IN ('vtt', 'docx', 'txt', 'json')),
  content TEXT NOT NULL,
  structured_data JSONB,
  summary TEXT,
  action_items JSONB,
  participants TEXT[],
  tags TEXT[],
  is_in_knowledge_base BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_transcripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own transcripts"
  ON public.meeting_transcripts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transcripts"
  ON public.meeting_transcripts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transcripts"
  ON public.meeting_transcripts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transcripts"
  ON public.meeting_transcripts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_meeting_transcripts_updated_at
  BEFORE UPDATE ON public.meeting_transcripts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();