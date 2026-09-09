-- Allow content_items (trilhas, mentorias gravadas, webinars) to have a downloadable
-- lesson material (PDF/PPT slide deck), reusing the existing public "resources" storage bucket.
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS material_url text,
  ADD COLUMN IF NOT EXISTS material_name text;
