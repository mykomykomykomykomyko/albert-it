-- Create table for saved canvases
CREATE TABLE public.saved_canvases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  canvas_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for saved stages
CREATE TABLE public.saved_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stage_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_stages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_canvases
CREATE POLICY "Users can view their own saved canvases"
  ON public.saved_canvases
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved canvases"
  ON public.saved_canvases
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved canvases"
  ON public.saved_canvases
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved canvases"
  ON public.saved_canvases
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for saved_stages
CREATE POLICY "Users can view their own saved stages"
  ON public.saved_stages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved stages"
  ON public.saved_stages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved stages"
  ON public.saved_stages
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved stages"
  ON public.saved_stages
  FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_saved_canvases_updated_at
  BEFORE UPDATE ON public.saved_canvases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_stages_updated_at
  BEFORE UPDATE ON public.saved_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();