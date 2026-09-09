
-- 0.1 Add missing columns to formations
ALTER TABLE formations ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;
ALTER TABLE formations ADD COLUMN IF NOT EXISTS duration_hours integer DEFAULT 0;

-- 0.2 Drop existing policies to recreate with expanded roles
DROP POLICY IF EXISTS "Admins can manage formations" ON formations;
DROP POLICY IF EXISTS "Authenticated users can view formations" ON formations;

CREATE POLICY "Admins can manage formations" ON formations
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_conteudo'));

CREATE POLICY "Users can view published formations" ON formations
FOR SELECT TO authenticated
USING (is_published = true);

-- 0.3 Drop and recreate formation_modules policies
DROP POLICY IF EXISTS "Admins can manage formation modules" ON formation_modules;
DROP POLICY IF EXISTS "Authenticated users can view formation modules" ON formation_modules;

CREATE POLICY "Admins can manage formation modules" ON formation_modules
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_conteudo'));

CREATE POLICY "Users can view modules of published formations" ON formation_modules
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM formations WHERE formations.id = formation_modules.formation_id AND formations.is_published = true));

-- 0.4 Drop and recreate formation_lessons policies
DROP POLICY IF EXISTS "Admins can manage formation lessons" ON formation_lessons;
DROP POLICY IF EXISTS "Authenticated users can view formation lessons" ON formation_lessons;

CREATE POLICY "Admins can manage formation lessons" ON formation_lessons
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_conteudo'));

CREATE POLICY "Users can view lessons of published formations" ON formation_lessons
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM formation_modules fm JOIN formations f ON f.id = fm.formation_id WHERE fm.id = formation_lessons.module_id AND f.is_published = true));

-- 0.5 Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('formation-thumbnails', 'formation-thumbnails', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('formation-videos', 'formation-videos', true) ON CONFLICT (id) DO NOTHING;

-- 0.6 Storage policies for thumbnails
CREATE POLICY "Admins can upload formation thumbnails" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'formation-thumbnails' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_conteudo')));

CREATE POLICY "Admins can delete formation thumbnails" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'formation-thumbnails' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_conteudo')));

CREATE POLICY "Anyone can view formation thumbnails" ON storage.objects FOR SELECT TO public
USING (bucket_id = 'formation-thumbnails');

CREATE POLICY "Admins can update formation thumbnails" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'formation-thumbnails' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_conteudo')));

-- 0.7 Storage policies for videos
CREATE POLICY "Admins can upload formation videos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'formation-videos' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_conteudo')));

CREATE POLICY "Admins can delete formation videos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'formation-videos' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_conteudo')));

CREATE POLICY "Authenticated can view formation videos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'formation-videos');

CREATE POLICY "Admins can update formation videos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'formation-videos' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_conteudo')));

-- 0.9 Trigger for auto-updating duration_hours
CREATE OR REPLACE FUNCTION update_formation_duration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _formation_id UUID;
  _total_minutes INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT formation_id INTO _formation_id FROM formation_modules WHERE id = OLD.module_id;
  ELSE
    SELECT formation_id INTO _formation_id FROM formation_modules WHERE id = NEW.module_id;
  END IF;

  SELECT COALESCE(SUM(fl.duration_minutes), 0) INTO _total_minutes
  FROM formation_lessons fl
  JOIN formation_modules fm ON fm.id = fl.module_id
  WHERE fm.formation_id = _formation_id;

  UPDATE formations 
  SET duration_hours = CEIL(_total_minutes::DECIMAL / 60)
  WHERE id = _formation_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_formation_duration ON formation_lessons;
CREATE TRIGGER trg_update_formation_duration
AFTER INSERT OR UPDATE OR DELETE ON formation_lessons
FOR EACH ROW
EXECUTE FUNCTION update_formation_duration();
