-- Add subscription fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS hubla_subscription_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_start_date timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone DEFAULT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_plan ON public.profiles(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_profiles_hubla_subscription_id ON public.profiles(hubla_subscription_id);