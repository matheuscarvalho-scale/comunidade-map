-- Create mentors table
CREATE TABLE public.mentors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT,
  specialty TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

-- RLS policies for mentors
CREATE POLICY "Authenticated users can view mentors"
ON public.mentors
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage mentors"
ON public.mentors
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add mentor_id to mentoring_sessions
ALTER TABLE public.mentoring_sessions
ADD COLUMN mentor_id UUID REFERENCES public.mentors(id);

-- Insert Bruno Mesquita as the only mentor
INSERT INTO public.mentors (name, bio, specialty, avatar_url, email)
VALUES (
  'Bruno Mesquita',
  'Empreendedor, Administrador, Experiência longa com Vendas e Recrutamento, além de ser Coordenador de Processos na MAP.',
  'Vendas e Processos',
  'https://files.manuscdn.com/user_upload_by_module/session_file/310519663172275922/1lVnfRlhNjJlVCTc.png',
  'brunomesquita@mapmarketplaces.com'
);

-- Update all existing sessions to link to Bruno and remove max_attendees limit
UPDATE public.mentoring_sessions
SET 
  mentor_id = (SELECT id FROM public.mentors WHERE email = 'brunomesquita@mapmarketplaces.com'),
  max_attendees = NULL,
  meeting_url = 'https://meet.google.com/map-mentoria-comunidade';