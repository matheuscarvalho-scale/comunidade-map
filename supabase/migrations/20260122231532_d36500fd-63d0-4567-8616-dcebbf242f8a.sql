-- Create lessons table for course content
CREATE TABLE public.lessons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    module_name text NOT NULL,
    module_order integer NOT NULL DEFAULT 1,
    title text NOT NULL,
    description text,
    video_url text,
    duration text,
    lesson_order integer NOT NULL DEFAULT 1,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create lesson progress table
CREATE TABLE public.lesson_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    completed boolean DEFAULT false,
    watched_seconds integer DEFAULT 0,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (user_id, lesson_id)
);

-- Create resources table
CREATE TABLE public.resources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    category text NOT NULL,
    type text NOT NULL, -- template, tool, document, spreadsheet
    file_url text,
    external_url text,
    thumbnail text,
    downloads_count integer DEFAULT 0,
    is_premium boolean DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create lesson materials table
CREATE TABLE public.lesson_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    title text NOT NULL,
    file_url text NOT NULL,
    file_type text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create member connections table for networking
CREATE TABLE public.member_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id uuid NOT NULL,
    following_id uuid NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (follower_id, following_id)
);

-- Add bio and specialties to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS specialties text[],
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';

-- Enable RLS on all new tables
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_connections ENABLE ROW LEVEL SECURITY;

-- RLS for lessons (authenticated users can view)
CREATE POLICY "Authenticated users can view lessons"
ON public.lessons FOR SELECT
TO authenticated
USING (true);

-- RLS for lesson_progress (users can manage their own)
CREATE POLICY "Users can view own lesson progress"
ON public.lesson_progress FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lesson progress"
ON public.lesson_progress FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lesson progress"
ON public.lesson_progress FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- RLS for resources (authenticated users can view)
CREATE POLICY "Authenticated users can view resources"
ON public.resources FOR SELECT
TO authenticated
USING (true);

-- RLS for lesson_materials (authenticated users can view)
CREATE POLICY "Authenticated users can view lesson materials"
ON public.lesson_materials FOR SELECT
TO authenticated
USING (true);

-- RLS for member_connections
CREATE POLICY "Authenticated users can view connections"
ON public.member_connections FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create connections"
ON public.member_connections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own connections"
ON public.member_connections FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

-- Insert sample lessons for existing courses
INSERT INTO public.lessons (course_id, module_name, module_order, title, description, video_url, duration, lesson_order)
SELECT 
    c.id,
    'Módulo 1 - Introdução',
    1,
    'Bem-vindo ao Curso',
    'Nesta aula você vai conhecer o conteúdo do curso e como aproveitar ao máximo.',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    '10:30',
    1
FROM public.courses c
LIMIT 5;

INSERT INTO public.lessons (course_id, module_name, module_order, title, description, video_url, duration, lesson_order)
SELECT 
    c.id,
    'Módulo 1 - Introdução',
    1,
    'Configurando seu Ambiente',
    'Aprenda a configurar todas as ferramentas necessárias para o curso.',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    '15:45',
    2
FROM public.courses c
LIMIT 5;

INSERT INTO public.lessons (course_id, module_name, module_order, title, description, video_url, duration, lesson_order)
SELECT 
    c.id,
    'Módulo 2 - Fundamentos',
    2,
    'Conceitos Básicos',
    'Entenda os conceitos fundamentais que serão usados ao longo do curso.',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    '20:00',
    3
FROM public.courses c
LIMIT 5;

-- Insert sample resources
INSERT INTO public.resources (title, description, category, type, thumbnail, downloads_count) VALUES
('Planilha de Precificação', 'Calcule o preço ideal dos seus produtos com esta planilha completa.', 'Finanças', 'spreadsheet', null, 245),
('Template de Catálogo', 'Template profissional para criar seu catálogo de produtos.', 'Marketing', 'template', null, 189),
('Checklist de Lançamento', 'Lista completa para lançar sua loja com sucesso.', 'Operações', 'document', null, 312),
('Calculadora de ROI', 'Ferramenta para calcular o retorno sobre investimento em marketing.', 'Finanças', 'tool', null, 156),
('Script de Vendas WhatsApp', 'Scripts prontos para aumentar suas conversões no WhatsApp.', 'Vendas', 'template', null, 423),
('Planilha de Controle de Estoque', 'Controle seu estoque de forma simples e eficiente.', 'Operações', 'spreadsheet', null, 287),
('Guia de Tráfego Pago', 'Guia completo para começar com anúncios no Facebook e Instagram.', 'Marketing', 'document', null, 198),
('Template de Copy para Anúncios', 'Modelos de copy que convertem para suas campanhas.', 'Marketing', 'template', null, 356);