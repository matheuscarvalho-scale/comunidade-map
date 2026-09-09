-- Add cloudflare_video_uid to formation_lessons
ALTER TABLE public.formation_lessons 
ADD COLUMN IF NOT EXISTS cloudflare_video_uid text;

-- Add cloudflare_video_uid to content_items
ALTER TABLE public.content_items 
ADD COLUMN IF NOT EXISTS cloudflare_video_uid text;