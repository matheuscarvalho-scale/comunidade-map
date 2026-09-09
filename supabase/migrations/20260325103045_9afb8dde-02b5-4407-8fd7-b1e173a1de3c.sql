
-- Add user_id column to mentors to link to profiles
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Set known user_ids
UPDATE public.mentors SET user_id = 'e4e8f871-cedd-47ab-9e14-3c52eed7d40e' WHERE id = 'f9fe084f-098c-4203-8c8b-6cd51c909c03';

-- Recreate mentors_public view to pull avatar from profiles when available
CREATE OR REPLACE VIEW public.mentors_public AS
SELECT 
  m.id,
  m.created_at,
  m.name,
  m.specialty,
  m.bio,
  COALESCE(p.avatar_url, m.avatar_url) AS avatar_url
FROM public.mentors m
LEFT JOIN public.profiles p ON p.user_id = m.user_id;
