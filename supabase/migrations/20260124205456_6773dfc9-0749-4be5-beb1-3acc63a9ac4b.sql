-- Member Analytics for behavior tracking
CREATE TABLE public.member_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  page_path TEXT,
  session_id TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.member_analytics ENABLE ROW LEVEL SECURITY;

-- Users can insert their own analytics
CREATE POLICY "Users can insert own analytics"
ON public.member_analytics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all analytics
CREATE POLICY "Admins can view all analytics"
ON public.member_analytics
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Index for performance
CREATE INDEX idx_member_analytics_user_id ON public.member_analytics(user_id);
CREATE INDEX idx_member_analytics_created_at ON public.member_analytics(created_at);

-- Webinars table
CREATE TABLE public.webinars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  partner_name TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  meeting_url TEXT,
  max_attendees INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view webinars"
ON public.webinars
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage webinars"
ON public.webinars
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Webinar checkins
CREATE TABLE public.webinar_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webinar_id UUID NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_sent BOOLEAN DEFAULT false,
  UNIQUE(webinar_id, user_id)
);

ALTER TABLE public.webinar_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can checkin to webinars"
ON public.webinar_checkins
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own checkins"
ON public.webinar_checkins
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all checkins"
ON public.webinar_checkins
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Mentoring sessions table
CREATE TABLE public.mentoring_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_name TEXT NOT NULL DEFAULT 'Bruno Mesquita',
  mentor_email TEXT NOT NULL DEFAULT 'brunomesquita@mapmarketplaces.com',
  title TEXT NOT NULL DEFAULT 'Mentoria em Grupo',
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  meeting_url TEXT,
  max_attendees INTEGER,
  session_type TEXT DEFAULT 'group',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mentoring_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sessions"
ON public.mentoring_sessions
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage sessions"
ON public.mentoring_sessions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Mentoring checkins
CREATE TABLE public.mentoring_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.mentoring_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_sent BOOLEAN DEFAULT false,
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.mentoring_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can checkin to sessions"
ON public.mentoring_checkins
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own checkins"
ON public.mentoring_checkins
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all checkins"
ON public.mentoring_checkins
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Growth track progress
CREATE TABLE public.growth_track_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phase TEXT NOT NULL,
  module_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, phase, module_id)
);

ALTER TABLE public.growth_track_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own progress"
ON public.growth_track_progress
FOR ALL
USING (auth.uid() = user_id);

-- Insert initial mentoring sessions (biweekly starting March 12, 2025)
INSERT INTO public.mentoring_sessions (title, scheduled_at, meeting_url, description) VALUES
('Mentoria em Grupo - MAP', '2025-03-12 19:00:00-03', 'https://meet.google.com/map-mentoria', 'Mentoria quinzenal com Bruno Mesquita'),
('Mentoria em Grupo - MAP', '2025-03-26 19:00:00-03', 'https://meet.google.com/map-mentoria', 'Mentoria quinzenal com Bruno Mesquita'),
('Mentoria em Grupo - MAP', '2025-04-09 19:00:00-03', 'https://meet.google.com/map-mentoria', 'Mentoria quinzenal com Bruno Mesquita'),
('Mentoria em Grupo - MAP', '2025-04-23 19:00:00-03', 'https://meet.google.com/map-mentoria', 'Mentoria quinzenal com Bruno Mesquita'),
('Mentoria em Grupo - MAP', '2025-05-07 19:00:00-03', 'https://meet.google.com/map-mentoria', 'Mentoria quinzenal com Bruno Mesquita'),
('Mentoria em Grupo - MAP', '2025-05-21 19:00:00-03', 'https://meet.google.com/map-mentoria', 'Mentoria quinzenal com Bruno Mesquita');

-- Insert sample webinars
INSERT INTO public.webinars (title, partner_name, scheduled_at, meeting_url, description) VALUES
('Como Escalar Vendas na Amazon', 'Amazon', '2025-02-15 19:00:00-03', 'https://meet.google.com/webinar-amazon', 'Webinar exclusivo com a equipe da Amazon Brasil'),
('Otimização de Listagens com BASE', 'BASE', '2025-03-15 19:00:00-03', 'https://meet.google.com/webinar-base', 'Aprenda a otimizar suas listagens com a BASE'),
('TikTok Shop: Primeiros Passos', 'TikTok Shop', '2025-04-15 19:00:00-03', 'https://meet.google.com/webinar-tiktok', 'Introdução ao TikTok Shop para vendedores');