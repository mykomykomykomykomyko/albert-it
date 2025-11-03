-- Create image analysis tables for persistence
CREATE TABLE public.image_analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Analysis',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.image_analysis_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.image_analysis_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT,
  resize_enabled BOOLEAN DEFAULT false,
  selected BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.image_analysis_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.image_analysis_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_custom BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.image_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.image_analysis_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES public.image_analysis_images(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES public.image_analysis_prompts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  processing_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create voice analysis results table
CREATE TABLE public.voice_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  transcription TEXT,
  analysis TEXT,
  audio_storage_path TEXT,
  model_used TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.image_analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_analysis_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_analysis_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_analysis_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for image_analysis_sessions
CREATE POLICY "Users can view their own sessions"
  ON public.image_analysis_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
  ON public.image_analysis_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.image_analysis_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.image_analysis_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for image_analysis_images
CREATE POLICY "Users can view their own images"
  ON public.image_analysis_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own images"
  ON public.image_analysis_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own images"
  ON public.image_analysis_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
  ON public.image_analysis_images FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for image_analysis_prompts
CREATE POLICY "Users can view their own prompts"
  ON public.image_analysis_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own prompts"
  ON public.image_analysis_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts"
  ON public.image_analysis_prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts"
  ON public.image_analysis_prompts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for image_analysis_results
CREATE POLICY "Users can view their own results"
  ON public.image_analysis_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own results"
  ON public.image_analysis_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own results"
  ON public.image_analysis_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own results"
  ON public.image_analysis_results FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for voice_analysis_results
CREATE POLICY "Users can view their own voice results"
  ON public.voice_analysis_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice results"
  ON public.voice_analysis_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice results"
  ON public.voice_analysis_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice results"
  ON public.voice_analysis_results FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at on sessions
CREATE TRIGGER update_image_analysis_sessions_updated_at
  BEFORE UPDATE ON public.image_analysis_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on voice_analysis_results
CREATE TRIGGER update_voice_analysis_results_updated_at
  BEFORE UPDATE ON public.voice_analysis_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();