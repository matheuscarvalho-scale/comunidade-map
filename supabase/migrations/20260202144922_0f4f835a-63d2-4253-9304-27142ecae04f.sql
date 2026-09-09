-- Criar tabela de certificados
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  formation_id UUID NOT NULL REFERENCES public.formations(id) ON DELETE CASCADE,
  formation_title TEXT NOT NULL,
  user_name TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  certificate_url TEXT,
  certificate_number TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own certificates" 
ON public.certificates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own certificates" 
ON public.certificates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create unique constraint to prevent duplicate certificates
CREATE UNIQUE INDEX idx_certificates_user_formation ON public.certificates(user_id, formation_id);

-- Create function to auto-unlock achievements based on lesson progress
CREATE OR REPLACE FUNCTION public.check_lesson_achievements()
RETURNS TRIGGER AS $$
DECLARE
  v_lessons_completed INTEGER;
  v_achievement_id UUID;
  v_formation_completed BOOLEAN;
BEGIN
  -- Count total completed lessons for this user
  SELECT COUNT(*) INTO v_lessons_completed
  FROM public.formation_lesson_progress
  WHERE user_id = NEW.user_id AND completed = true;

  -- First lesson achievement (Primeira Aula)
  IF v_lessons_completed = 1 THEN
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Primeira Aula';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
      VALUES (NEW.user_id, v_achievement_id, now(), 1)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET unlocked_at = COALESCE(user_achievements.unlocked_at, now());
    END IF;
  END IF;

  -- 10 lessons achievement (Estudante Dedicado)
  IF v_lessons_completed >= 10 THEN
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Estudante Dedicado';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
      VALUES (NEW.user_id, v_achievement_id, now(), v_lessons_completed)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET 
        unlocked_at = COALESCE(user_achievements.unlocked_at, now()),
        progress = v_lessons_completed;
    END IF;
  ELSE
    -- Update progress even if not unlocked yet
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Estudante Dedicado';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, progress)
      VALUES (NEW.user_id, v_achievement_id, v_lessons_completed)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET progress = v_lessons_completed;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for lesson progress
CREATE TRIGGER on_lesson_progress_check_achievements
AFTER INSERT OR UPDATE ON public.formation_lesson_progress
FOR EACH ROW
WHEN (NEW.completed = true)
EXECUTE FUNCTION public.check_lesson_achievements();

-- Create function to check formation completion
CREATE OR REPLACE FUNCTION public.check_formation_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_formation_id UUID;
  v_total_lessons INTEGER;
  v_completed_lessons INTEGER;
  v_achievement_id UUID;
  v_formations_completed INTEGER;
BEGIN
  -- Get the formation_id from the lesson
  SELECT fm.formation_id INTO v_formation_id
  FROM public.formation_lessons fl
  JOIN public.formation_modules fm ON fl.module_id = fm.id
  WHERE fl.id = NEW.lesson_id;

  IF v_formation_id IS NOT NULL THEN
    -- Count total lessons in this formation
    SELECT COUNT(*) INTO v_total_lessons
    FROM public.formation_lessons fl
    JOIN public.formation_modules fm ON fl.module_id = fm.id
    WHERE fm.formation_id = v_formation_id;

    -- Count completed lessons by this user in this formation
    SELECT COUNT(*) INTO v_completed_lessons
    FROM public.formation_lesson_progress flp
    JOIN public.formation_lessons fl ON flp.lesson_id = fl.id
    JOIN public.formation_modules fm ON fl.module_id = fm.id
    WHERE fm.formation_id = v_formation_id 
      AND flp.user_id = NEW.user_id 
      AND flp.completed = true;

    -- If formation is complete, unlock "Formação Completa" achievement
    IF v_completed_lessons >= v_total_lessons THEN
      SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Formação Completa';
      IF v_achievement_id IS NOT NULL THEN
        INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
        VALUES (NEW.user_id, v_achievement_id, now(), 1)
        ON CONFLICT (user_id, achievement_id) DO UPDATE SET unlocked_at = COALESCE(user_achievements.unlocked_at, now());
      END IF;

      -- Count total formations completed for "Mestre do Conhecimento"
      SELECT COUNT(DISTINCT fm2.formation_id) INTO v_formations_completed
      FROM public.formation_lesson_progress flp2
      JOIN public.formation_lessons fl2 ON flp2.lesson_id = fl2.id
      JOIN public.formation_modules fm2 ON fl2.module_id = fm2.id
      WHERE flp2.user_id = NEW.user_id AND flp2.completed = true
      GROUP BY fm2.formation_id
      HAVING COUNT(*) >= (
        SELECT COUNT(*) FROM public.formation_lessons fl3
        JOIN public.formation_modules fm3 ON fl3.module_id = fm3.id
        WHERE fm3.formation_id = fm2.formation_id
      );

      IF v_formations_completed >= 5 THEN
        SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Mestre do Conhecimento';
        IF v_achievement_id IS NOT NULL THEN
          INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
          VALUES (NEW.user_id, v_achievement_id, now(), v_formations_completed)
          ON CONFLICT (user_id, achievement_id) DO UPDATE SET 
            unlocked_at = COALESCE(user_achievements.unlocked_at, now()),
            progress = v_formations_completed;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for formation completion
CREATE TRIGGER on_formation_completion
AFTER INSERT OR UPDATE ON public.formation_lesson_progress
FOR EACH ROW
WHEN (NEW.completed = true)
EXECUTE FUNCTION public.check_formation_completion();

-- Create function to check mentoring achievements
CREATE OR REPLACE FUNCTION public.check_mentoring_achievements()
RETURNS TRIGGER AS $$
DECLARE
  v_mentoring_count INTEGER;
  v_achievement_id UUID;
BEGIN
  -- Count total mentoring check-ins for this user
  SELECT COUNT(*) INTO v_mentoring_count
  FROM public.mentoring_checkins
  WHERE user_id = NEW.user_id;

  -- First mentoring achievement
  IF v_mentoring_count = 1 THEN
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Primeira Mentoria';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
      VALUES (NEW.user_id, v_achievement_id, now(), 1)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET unlocked_at = COALESCE(user_achievements.unlocked_at, now());
    END IF;
  END IF;

  -- 10 mentoring achievement (Participante Ativo)
  IF v_mentoring_count >= 10 THEN
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Participante Ativo';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
      VALUES (NEW.user_id, v_achievement_id, now(), v_mentoring_count)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET 
        unlocked_at = COALESCE(user_achievements.unlocked_at, now()),
        progress = v_mentoring_count;
    END IF;
  END IF;

  -- 50 mentoring achievement (Maratonista)
  IF v_mentoring_count >= 50 THEN
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Maratonista';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
      VALUES (NEW.user_id, v_achievement_id, now(), v_mentoring_count)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET 
        unlocked_at = COALESCE(user_achievements.unlocked_at, now()),
        progress = v_mentoring_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for mentoring check-ins
CREATE TRIGGER on_mentoring_checkin
AFTER INSERT ON public.mentoring_checkins
FOR EACH ROW
EXECUTE FUNCTION public.check_mentoring_achievements();

-- Create function to check community post achievements
CREATE OR REPLACE FUNCTION public.check_community_achievements()
RETURNS TRIGGER AS $$
DECLARE
  v_post_count INTEGER;
  v_achievement_id UUID;
BEGIN
  -- Count total posts by this user
  SELECT COUNT(*) INTO v_post_count
  FROM public.community_posts
  WHERE user_id = NEW.user_id;

  -- First post achievement
  IF v_post_count = 1 THEN
    SELECT id INTO v_achievement_id FROM public.achievements WHERE name = 'Primeiro Post';
    IF v_achievement_id IS NOT NULL THEN
      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, progress)
      VALUES (NEW.user_id, v_achievement_id, now(), 1)
      ON CONFLICT (user_id, achievement_id) DO UPDATE SET unlocked_at = COALESCE(user_achievements.unlocked_at, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for community posts
CREATE TRIGGER on_community_post
AFTER INSERT ON public.community_posts
FOR EACH ROW
EXECUTE FUNCTION public.check_community_achievements();

-- Add unique constraint to user_achievements to support ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_achievements_unique ON public.user_achievements(user_id, achievement_id);