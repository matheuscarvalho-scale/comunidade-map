
-- Create user_onboarding table to track onboarding progress and responses
CREATE TABLE public.user_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  
  -- Terms acceptance
  terms_accepted_at TIMESTAMP WITH TIME ZONE,
  terms_version TEXT,
  
  -- Onboarding progress
  current_step INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Step 2 - Personal Info
  full_name TEXT,
  whatsapp TEXT,
  city_state TEXT,
  
  -- Step 3 - Experience
  experience_level TEXT,
  
  -- Step 4 - Business Model (array for multiple selections)
  business_models TEXT[],
  
  -- Step 5 - Goals
  main_goal TEXT,
  
  -- Step 6 - Dedication
  weekly_hours TEXT,
  
  -- Step 7 - Revenue Goal
  revenue_goal TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own onboarding"
  ON public.user_onboarding
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding"
  ON public.user_onboarding
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
  ON public.user_onboarding
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
