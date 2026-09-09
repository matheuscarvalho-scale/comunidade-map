
-- Add new fields to profiles table for networking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS niche text DEFAULT 'outro',
ADD COLUMN IF NOT EXISTS location_state text,
ADD COLUMN IF NOT EXISTS location_city text,
ADD COLUMN IF NOT EXISTS experience_level text DEFAULT 'iniciante',
ADD COLUMN IF NOT EXISTS website_url text,
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- Create member_messages table for direct messaging
CREATE TABLE IF NOT EXISTS public.member_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sender_receiver_different CHECK (sender_id != receiver_id)
);

-- Enable RLS on member_messages
ALTER TABLE public.member_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for member_messages
CREATE POLICY "Users can view own messages"
ON public.member_messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.member_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can mark received messages as read"
ON public.member_messages
FOR UPDATE
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete own sent messages"
ON public.member_messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Update profiles RLS to allow viewing public profiles
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
CREATE POLICY "Users can view public profiles"
ON public.profiles
FOR SELECT
USING (is_public = true OR auth.uid() = user_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.member_messages;

-- Create index for faster message queries
CREATE INDEX IF NOT EXISTS idx_member_messages_sender ON public.member_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_member_messages_receiver ON public.member_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_member_messages_created_at ON public.member_messages(created_at DESC);

-- Create index for profiles filtering
CREATE INDEX IF NOT EXISTS idx_profiles_niche ON public.profiles(niche);
CREATE INDEX IF NOT EXISTS idx_profiles_location_state ON public.profiles(location_state);
CREATE INDEX IF NOT EXISTS idx_profiles_experience_level ON public.profiles(experience_level);
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON public.profiles(is_public);
