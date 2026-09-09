-- Drop and recreate content_tracks with slug field
ALTER TABLE content_tracks ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Update content_items to include category and thumbnail
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_content_tracks_slug ON content_tracks(slug);

-- Insert the 4 events in order
INSERT INTO content_tracks (title, slug, description, category, order_index, is_active, event_name, event_date) VALUES
  ('Amazon e MAP', 'amazon-map', 'Parceria exclusiva Amazon - Projeto Amazon para acelerar suas vendas no maior marketplace do mundo.', 'Eventos', 1, true, 'Projeto Amazon', '2026-01-15'),
  ('MAP Experience 2026', 'map-experience-2026', 'O maior evento de e-commerce do Brasil. Painéis e palestras com os maiores especialistas do mercado.', 'Eventos', 2, true, 'MAP Experience 2026', '2026-03-20'),
  ('MAP.IA', 'map-ia', 'Evento focado em Inteligência Artificial aplicada ao e-commerce. Aprenda a usar IA para escalar seu negócio.', 'Eventos', 3, true, 'MAP.IA', '2026-02-10'),
  ('MAP.IN Rio', 'map-in-rio', 'Evento presencial exclusivo no Rio de Janeiro. Networking e conteúdo de alta qualidade.', 'Eventos', 4, true, 'MAP.IN Rio', '2026-04-05')
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  order_index = EXCLUDED.order_index;

-- Get track IDs and insert sample talks
DO $$
DECLARE
  amazon_id UUID;
  experience_id UUID;
  ia_id UUID;
  rio_id UUID;
BEGIN
  SELECT id INTO amazon_id FROM content_tracks WHERE slug = 'amazon-map';
  SELECT id INTO experience_id FROM content_tracks WHERE slug = 'map-experience-2026';
  SELECT id INTO ia_id FROM content_tracks WHERE slug = 'map-ia';
  SELECT id INTO rio_id FROM content_tracks WHERE slug = 'map-in-rio';

  -- Amazon e MAP - 3 palestras
  INSERT INTO content_items (track_id, title, speaker, category, description, duration_minutes, order_index) VALUES
    (amazon_id, 'Como Começar a Vender na Amazon', 'Equipe Amazon', 'Marketplaces', 'Passo a passo para criar sua conta e começar a vender na Amazon Brasil.', 45, 1),
    (amazon_id, 'FBA vs FBM: Qual Modelo Escolher?', 'Especialista Amazon', 'Logística e Operações', 'Entenda as diferenças entre Fulfillment by Amazon e Fulfillment by Merchant.', 60, 2),
    (amazon_id, 'Otimização de Listings na Amazon', 'Consultor MAP', 'Criação de Anúncios', 'Técnicas avançadas para criar listings que convertem mais.', 50, 3);

  -- MAP Experience 2026 - 5 palestras
  INSERT INTO content_items (track_id, title, speaker, category, description, duration_minutes, order_index) VALUES
    (experience_id, 'IA Generativa para E-commerce: O Futuro é Agora', 'Bruno Mesquita', 'IA Aplicada ao E-commerce', 'Como usar ChatGPT, Claude e outras IAs para automatizar seu negócio.', 60, 1),
    (experience_id, 'Precificação Inteligente: Maximize seus Lucros', 'Maria Santos', 'Precificação', 'Estratégias de pricing dinâmico para aumentar margens.', 45, 2),
    (experience_id, 'Anúncios que Vendem: Do Zero ao ROI Positivo', 'Pedro Costa', 'Criação de Anúncios', 'Masterclass de criação de anúncios para Mercado Livre e Amazon.', 55, 3),
    (experience_id, 'Logística 4.0: Entrega Rápida, Cliente Feliz', 'Ana Lima', 'Logística e Operações', 'Cases de sucesso em otimização logística.', 50, 4),
    (experience_id, 'Dominando os Marketplaces em 2026', 'Carlos Oliveira', 'Marketplaces', 'Tendências e estratégias para os principais marketplaces.', 65, 5);

  -- MAP.IA - 3 palestras
  INSERT INTO content_items (track_id, title, speaker, category, description, duration_minutes, order_index) VALUES
    (ia_id, 'ChatGPT para Atendimento ao Cliente', 'Lucas Tech', 'IA Aplicada ao E-commerce', 'Automatize seu SAC com inteligência artificial.', 40, 1),
    (ia_id, 'IA na Criação de Conteúdo e Anúncios', 'Julia Digital', 'Criação de Anúncios', 'Gere textos, imagens e vídeos com IA.', 50, 2),
    (ia_id, 'Análise de Dados com IA: Tome Decisões Melhores', 'Roberto Data', 'Gestão Financeira', 'Use IA para analisar suas métricas e prever tendências.', 55, 3);

  -- MAP.IN Rio - 3 palestras
  INSERT INTO content_items (track_id, title, speaker, category, description, duration_minutes, order_index) VALUES
    (rio_id, 'Networking Estratégico no E-commerce', 'Fernanda Rio', 'Marketplaces', 'Como construir parcerias que aceleram seu crescimento.', 45, 1),
    (rio_id, 'Gestão Financeira para Sellers', 'Ricardo Finanças', 'Gestão Financeira', 'Controle seu fluxo de caixa e aumente sua lucratividade.', 50, 2),
    (rio_id, 'Operação Enxuta: Faça Mais com Menos', 'Patricia Ops', 'Logística e Operações', 'Otimize processos e reduza custos operacionais.', 40, 3);
END $$;