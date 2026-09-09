-- Create platform_updates table for news and announcements
CREATE TABLE public.platform_updates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL DEFAULT 'news', -- 'news', 'feature', 'announcement'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.platform_updates ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view active updates
CREATE POLICY "Authenticated users can view active updates"
  ON public.platform_updates
  FOR SELECT
  USING (is_active = true);

-- Policy for admins to manage updates
CREATE POLICY "Admins can manage updates"
  ON public.platform_updates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert some initial platform updates
INSERT INTO public.platform_updates (title, description, type) VALUES
('Nova Formação de Tráfego Pago', 'Aprenda a escalar suas vendas com tráfego pago na Amazon e Mercado Livre.', 'feature'),
('Mentoria Especial de Precificação', 'Nova sessão sobre estratégias avançadas de precificação para maximizar lucros.', 'announcement'),
('Área de Recursos Atualizada', 'Novos templates de planilhas e documentos disponíveis na área de recursos.', 'news');