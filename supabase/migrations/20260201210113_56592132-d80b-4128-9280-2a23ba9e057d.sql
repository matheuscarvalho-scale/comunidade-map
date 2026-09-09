-- PARTE 1: Renomear tabelas da Trilha de Crescimento para Formações
-- Drop existing foreign keys first
ALTER TABLE track_modules DROP CONSTRAINT IF EXISTS track_modules_track_id_fkey;
ALTER TABLE track_lessons DROP CONSTRAINT IF EXISTS track_lessons_module_id_fkey;
ALTER TABLE track_lesson_progress DROP CONSTRAINT IF EXISTS track_lesson_progress_lesson_id_fkey;

-- Rename tables
ALTER TABLE learning_tracks RENAME TO formations;
ALTER TABLE track_modules RENAME TO formation_modules;
ALTER TABLE track_lessons RENAME TO formation_lessons;
ALTER TABLE track_lesson_progress RENAME TO formation_lesson_progress;

-- Recreate foreign keys with new table names
ALTER TABLE formation_modules 
  ADD CONSTRAINT formation_modules_formation_id_fkey 
  FOREIGN KEY (track_id) REFERENCES formations(id) ON DELETE CASCADE;

ALTER TABLE formation_lessons 
  ADD CONSTRAINT formation_lessons_module_id_fkey 
  FOREIGN KEY (module_id) REFERENCES formation_modules(id) ON DELETE CASCADE;

ALTER TABLE formation_lesson_progress 
  ADD CONSTRAINT formation_lesson_progress_lesson_id_fkey 
  FOREIGN KEY (lesson_id) REFERENCES formation_lessons(id) ON DELETE CASCADE;

-- Rename column track_id to formation_id in formation_modules
ALTER TABLE formation_modules RENAME COLUMN track_id TO formation_id;

-- Update RLS policies for formations (drop old, create new)
DROP POLICY IF EXISTS "Admins can manage learning tracks" ON formations;
DROP POLICY IF EXISTS "Authenticated users can view learning tracks" ON formations;

CREATE POLICY "Admins can manage formations" ON formations
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view formations" ON formations
  FOR SELECT USING (true);

-- Update RLS policies for formation_modules
DROP POLICY IF EXISTS "Admins can manage track modules" ON formation_modules;
DROP POLICY IF EXISTS "Authenticated users can view track modules" ON formation_modules;

CREATE POLICY "Admins can manage formation modules" ON formation_modules
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view formation modules" ON formation_modules
  FOR SELECT USING (true);

-- Update RLS policies for formation_lessons
DROP POLICY IF EXISTS "Admins can manage track lessons" ON formation_lessons;
DROP POLICY IF EXISTS "Authenticated users can view track lessons" ON formation_lessons;

CREATE POLICY "Admins can manage formation lessons" ON formation_lessons
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view formation lessons" ON formation_lessons
  FOR SELECT USING (true);

-- Update RLS policies for formation_lesson_progress
DROP POLICY IF EXISTS "Users can insert own progress" ON formation_lesson_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON formation_lesson_progress;
DROP POLICY IF EXISTS "Users can view own progress" ON formation_lesson_progress;

CREATE POLICY "Users can view own formation progress" ON formation_lesson_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own formation progress" ON formation_lesson_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own formation progress" ON formation_lesson_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- PARTE 3: Criar novas tabelas para Trilha de Conteúdo
CREATE TABLE content_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT NOT NULL,
  event_name TEXT,
  event_date DATE,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE content_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES content_tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  speaker TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE content_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_tracks
CREATE POLICY "Admins can manage content tracks" ON content_tracks
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active content tracks" ON content_tracks
  FOR SELECT USING (is_active = true);

-- RLS policies for content_items
CREATE POLICY "Admins can manage content items" ON content_items
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view content items" ON content_items
  FOR SELECT USING (true);