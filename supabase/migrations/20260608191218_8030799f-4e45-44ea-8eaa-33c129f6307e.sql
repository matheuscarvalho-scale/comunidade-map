ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true;
CREATE OR REPLACE VIEW public.mentors_public AS
SELECT id, user_id, name, avatar_url, specialty, bio, created_at, is_listed FROM public.mentors;