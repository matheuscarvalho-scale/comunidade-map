-- 1.1. Adicionar campo thumbnail_url
ALTER TABLE webinars ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 1.2. Adicionar Foreign Key em webinar_checkins
ALTER TABLE webinar_checkins
ADD CONSTRAINT fk_webinar_checkins_webinar
FOREIGN KEY (webinar_id) REFERENCES webinars(id) ON DELETE CASCADE;

-- 1.3. Adicionar UNIQUE constraint para prevenir check-ins duplicados
ALTER TABLE webinar_checkins
ADD CONSTRAINT unique_webinar_user_checkin
UNIQUE (webinar_id, user_id);

-- 1.4. Adicionar Foreign Key de user_id
ALTER TABLE webinar_checkins
ADD CONSTRAINT fk_webinar_checkins_user
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 1.5. Criar bucket no Supabase Storage para thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('webinar-thumbnails', 'webinar-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- 1.6. RLS policy para leitura pública do bucket
CREATE POLICY "Public read access for webinar thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'webinar-thumbnails');

-- 1.7. RLS policy para admins fazerem upload
CREATE POLICY "Admins can upload webinar thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'webinar-thumbnails' AND has_role(auth.uid(), 'admin'::app_role));

-- 1.8. RLS policy para admins deletarem
CREATE POLICY "Admins can delete webinar thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'webinar-thumbnails' AND has_role(auth.uid(), 'admin'::app_role));