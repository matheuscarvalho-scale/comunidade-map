
-- Add presenter fields to formations table
ALTER TABLE public.formations 
  ADD COLUMN IF NOT EXISTS presenter_name TEXT,
  ADD COLUMN IF NOT EXISTS presenter_bio TEXT,
  ADD COLUMN IF NOT EXISTS presenter_avatar TEXT;

-- Add presenter fields to formation_lessons table
ALTER TABLE public.formation_lessons
  ADD COLUMN IF NOT EXISTS presenter_name TEXT,
  ADD COLUMN IF NOT EXISTS presenter_bio TEXT,
  ADD COLUMN IF NOT EXISTS presenter_avatar TEXT;

-- Add presenter fields to content_items table
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS presenter_name TEXT,
  ADD COLUMN IF NOT EXISTS presenter_bio TEXT,
  ADD COLUMN IF NOT EXISTS presenter_avatar TEXT;

-- Add presenter fields to content_tracks table
ALTER TABLE public.content_tracks
  ADD COLUMN IF NOT EXISTS presenter_name TEXT,
  ADD COLUMN IF NOT EXISTS presenter_bio TEXT,
  ADD COLUMN IF NOT EXISTS presenter_avatar TEXT;
