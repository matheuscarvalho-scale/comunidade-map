
-- Table to store feature toggles per page
CREATE TABLE public.feature_toggles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  label text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Anyone can view feature toggles"
ON public.feature_toggles FOR SELECT
USING (true);

-- Only admins can update
CREATE POLICY "Admins can manage feature toggles"
ON public.feature_toggles FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed with all sidebar pages (excluding settings)
INSERT INTO public.feature_toggles (feature_key, label, is_enabled) VALUES
  ('dashboard', 'Dashboard', true),
  ('noticias', 'Notícias', true),
  ('formacoes', 'Formações', true),
  ('trilha-conteudo', 'Trilha de Conteúdo', true),
  ('mentorias', 'Mentorias', true),
  ('webinars', 'Webinars', true),
  ('comunidade', 'Comunidade', true),
  ('recursos', 'Recursos', true),
  ('networking', 'Networking', true),
  ('conquistas', 'Conquistas', true),
  ('parceiros', 'Parceiros', true),
  ('meu-cashback', 'Meu Cashback', true),
  ('certificados', 'Certificados', true),
  ('sugestoes', 'Sugestões', true);
