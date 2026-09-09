
-- Table to cache AI-generated recommendations
CREATE TABLE public.user_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_step JSONB NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- One active recommendation set per user
CREATE UNIQUE INDEX idx_user_recommendations_user ON public.user_recommendations (user_id);

-- Enable RLS
ALTER TABLE public.user_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own recommendations
CREATE POLICY "Users can view own recommendations"
ON public.user_recommendations FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert own recommendations
CREATE POLICY "Users can insert own recommendations"
ON public.user_recommendations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own recommendations
CREATE POLICY "Users can update own recommendations"
ON public.user_recommendations FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_recommendations_updated_at
BEFORE UPDATE ON public.user_recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
