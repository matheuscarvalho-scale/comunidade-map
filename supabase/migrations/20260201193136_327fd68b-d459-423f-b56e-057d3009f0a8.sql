-- Create learning_tracks table
CREATE TABLE public.learning_tracks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  level text NOT NULL DEFAULT 'iniciante',
  thumbnail_url text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create track_modules table
CREATE TABLE public.track_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id uuid NOT NULL REFERENCES public.learning_tracks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create track_lessons table
CREATE TABLE public.track_lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid NOT NULL REFERENCES public.track_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text,
  duration_minutes integer DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create track_lesson_progress table
CREATE TABLE public.track_lesson_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.track_lessons(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.learning_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for learning_tracks (public read)
CREATE POLICY "Authenticated users can view learning tracks"
  ON public.learning_tracks FOR SELECT
  USING (true);

-- RLS Policies for track_modules (public read)
CREATE POLICY "Authenticated users can view track modules"
  ON public.track_modules FOR SELECT
  USING (true);

-- RLS Policies for track_lessons (public read)
CREATE POLICY "Authenticated users can view track lessons"
  ON public.track_lessons FOR SELECT
  USING (true);

-- RLS Policies for track_lesson_progress
CREATE POLICY "Users can view own progress"
  ON public.track_lesson_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.track_lesson_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.track_lesson_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can manage learning tracks"
  ON public.learning_tracks FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage track modules"
  ON public.track_modules FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage track lessons"
  ON public.track_lessons FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Insert Track 1: Fundamentos do E-commerce
INSERT INTO public.learning_tracks (id, title, description, level, order_index)
VALUES ('11111111-1111-1111-1111-111111111111', 'Fundamentos do E-commerce', 'Aprenda os conceitos essenciais para começar no e-commerce com o pé direito.', 'iniciante', 1);

-- Modules for Track 1
INSERT INTO public.track_modules (id, track_id, title, description, order_index) VALUES
('11111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111111', 'Mentalidade Empreendedora', 'Desenvolva a mentalidade certa para ter sucesso no e-commerce', 1),
('11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111111', 'Escolhendo seu Nicho', 'Como identificar e validar o nicho ideal para seu negócio', 2),
('11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111111', 'Primeiros Passos no Digital', 'Configure sua operação online do zero', 3),
('11111111-1111-1111-1111-111111111104', '11111111-1111-1111-1111-111111111111', 'Precificação e Margem', 'Aprenda a precificar corretamente seus produtos', 4),
('11111111-1111-1111-1111-111111111105', '11111111-1111-1111-1111-111111111111', 'Atendimento ao Cliente', 'Conquiste e fidelize clientes com um atendimento excelente', 5);

-- Lessons for Track 1 Modules
INSERT INTO public.track_lessons (module_id, title, description, duration_minutes, order_index) VALUES
-- Module 1: Mentalidade (4 aulas)
('11111111-1111-1111-1111-111111111101', 'Por que empreender no E-commerce?', 'Entenda as oportunidades do mercado digital brasileiro', 15, 1),
('11111111-1111-1111-1111-111111111101', 'Mindset de Crescimento', 'A mentalidade que separa os que crescem dos que desistem', 20, 2),
('11111111-1111-1111-1111-111111111101', 'Disciplina e Rotina', 'Como criar uma rotina produtiva para seu negócio', 18, 3),
('11111111-1111-1111-1111-111111111101', 'Superando Obstáculos', 'Técnicas para lidar com desafios e fracassos', 22, 4),
-- Module 2: Nicho (3 aulas)
('11111111-1111-1111-1111-111111111102', 'O que é um Nicho de Mercado', 'Conceitos fundamentais para escolher seu nicho', 12, 1),
('11111111-1111-1111-1111-111111111102', 'Pesquisa de Mercado', 'Ferramentas e técnicas para validar seu nicho', 25, 2),
('11111111-1111-1111-1111-111111111102', 'Análise de Concorrência', 'Como estudar seus concorrentes e encontrar diferenciais', 20, 3),
-- Module 3: Primeiros Passos (5 aulas)
('11111111-1111-1111-1111-111111111103', 'Criando sua Conta nos Marketplaces', 'Passo a passo para criar contas profissionais', 18, 1),
('11111111-1111-1111-1111-111111111103', 'Documentação Necessária', 'Todos os documentos que você vai precisar', 15, 2),
('11111111-1111-1111-1111-111111111103', 'Cadastrando seus Primeiros Produtos', 'Como criar anúncios que vendem', 30, 3),
('11111111-1111-1111-1111-111111111103', 'Configurando Frete e Envio', 'Opções de logística para iniciantes', 22, 4),
('11111111-1111-1111-1111-111111111103', 'Recebendo sua Primeira Venda', 'O que fazer quando a venda chegar', 15, 5),
-- Module 4: Precificação (4 aulas)
('11111111-1111-1111-1111-111111111104', 'Entendendo Custos e Margens', 'Todos os custos que você precisa considerar', 25, 1),
('11111111-1111-1111-1111-111111111104', 'Calculadora de Preços', 'Planilha prática para precificação', 20, 2),
('11111111-1111-1111-1111-111111111104', 'Estratégias de Preço', 'Quando usar preço baixo ou premium', 18, 3),
('11111111-1111-1111-1111-111111111104', 'Promoções e Descontos', 'Como fazer promoções sem perder dinheiro', 15, 4),
-- Module 5: Atendimento (3 aulas)
('11111111-1111-1111-1111-111111111105', 'Padrões de Atendimento', 'Scripts e templates para responder clientes', 20, 1),
('11111111-1111-1111-1111-111111111105', 'Lidando com Reclamações', 'Transforme problemas em oportunidades', 22, 2),
('11111111-1111-1111-1111-111111111105', 'Pós-Venda que Fideliza', 'Técnicas para fazer o cliente voltar', 18, 3);

-- Insert Track 2: Dominando Marketplaces
INSERT INTO public.learning_tracks (id, title, description, level, order_index)
VALUES ('22222222-2222-2222-2222-222222222222', 'Dominando Marketplaces', 'Domine as principais plataformas de venda do Brasil.', 'intermediário', 2);

-- Modules for Track 2
INSERT INTO public.track_modules (id, track_id, title, description, order_index) VALUES
('22222222-2222-2222-2222-222222222201', '22222222-2222-2222-2222-222222222222', 'Mercado Livre do Zero ao Avançado', 'Tudo sobre o maior marketplace da América Latina', 1),
('22222222-2222-2222-2222-222222222202', '22222222-2222-2222-2222-222222222222', 'Amazon FBA Brasil', 'Aprenda a vender com a logística da Amazon', 2),
('22222222-2222-2222-2222-222222222203', '22222222-2222-2222-2222-222222222222', 'Shopee Estratégico', 'Estratégias para crescer na Shopee', 3),
('22222222-2222-2222-2222-222222222204', '22222222-2222-2222-2222-222222222222', 'Multi-canal: Vendendo em Todos', 'Como gerenciar múltiplos marketplaces', 4),
('22222222-2222-2222-2222-222222222205', '22222222-2222-2222-2222-222222222222', 'Gestão de Estoque e Logística', 'Organize sua operação para escalar', 5);

-- Lessons for Track 2
INSERT INTO public.track_lessons (module_id, title, description, duration_minutes, order_index) VALUES
-- Module 1: Mercado Livre (6 aulas)
('22222222-2222-2222-2222-222222222201', 'Entendendo o Algoritmo do ML', 'Como funciona o sistema de ranqueamento', 25, 1),
('22222222-2222-2222-2222-222222222201', 'Criando Anúncios Otimizados', 'Títulos, fotos e descrições que convertem', 30, 2),
('22222222-2222-2222-2222-222222222201', 'Reputação e Métricas', 'Mantenha sua reputação verde', 20, 3),
('22222222-2222-2222-2222-222222222201', 'Mercado Envios Full', 'Vantagens e como usar o Full', 22, 4),
('22222222-2222-2222-2222-222222222201', 'Catálogo e Buy Box', 'Estratégias para ganhar a Buy Box', 25, 5),
('22222222-2222-2222-2222-222222222201', 'Análise de Dados no ML', 'Métricas e relatórios importantes', 20, 6),
-- Module 2: Amazon (5 aulas)
('22222222-2222-2222-2222-222222222202', 'Primeiros Passos na Amazon', 'Criando sua conta seller', 18, 1),
('22222222-2222-2222-2222-222222222202', 'FBA vs FBM', 'Qual modelo é melhor para você', 22, 2),
('22222222-2222-2222-2222-222222222202', 'Listando Produtos na Amazon', 'Otimização de listings', 28, 3),
('22222222-2222-2222-2222-222222222202', 'Enviando para Centros FBA', 'Logística de envio para Amazon', 25, 4),
('22222222-2222-2222-2222-222222222202', 'Seller Central Avançado', 'Recursos avançados da plataforma', 20, 5),
-- Module 3: Shopee (4 aulas)
('22222222-2222-2222-2222-222222222203', 'Configurando Loja na Shopee', 'Primeiros passos na plataforma', 15, 1),
('22222222-2222-2222-2222-222222222203', 'Programa de Frete Grátis', 'Como participar e usar a seu favor', 18, 2),
('22222222-2222-2222-2222-222222222203', 'Lives na Shopee', 'Vendendo ao vivo', 22, 3),
('22222222-2222-2222-2222-222222222203', 'Cupons e Promoções', 'Estratégias promocionais na Shopee', 20, 4),
-- Module 4: Multi-canal (4 aulas)
('22222222-2222-2222-2222-222222222204', 'Hub de Integração', 'Ferramentas para gerenciar múltiplos canais', 25, 1),
('22222222-2222-2222-2222-222222222204', 'Sincronização de Estoque', 'Evitando rupturas e sobrevenda', 20, 2),
('22222222-2222-2222-2222-222222222204', 'Precificação por Canal', 'Ajustando preços para cada marketplace', 18, 3),
('22222222-2222-2222-2222-222222222204', 'Relatórios Consolidados', 'Visão unificada do seu negócio', 22, 4),
-- Module 5: Estoque (5 aulas)
('22222222-2222-2222-2222-222222222205', 'Gestão de Estoque Básica', 'Controles essenciais', 20, 1),
('22222222-2222-2222-2222-222222222205', 'Curva ABC', 'Priorizando seus produtos', 18, 2),
('22222222-2222-2222-2222-222222222205', 'Ponto de Pedido', 'Quando comprar mais estoque', 22, 3),
('22222222-2222-2222-2222-222222222205', 'Logística Reversa', 'Gerenciando devoluções', 20, 4),
('22222222-2222-2222-2222-222222222205', 'Terceirizando a Logística', 'Quando e como terceirizar', 25, 5);

-- Insert Track 3: Ads em Marketplaces
INSERT INTO public.learning_tracks (id, title, description, level, order_index)
VALUES ('33333333-3333-3333-3333-333333333333', 'Ads em Marketplaces', 'Domine a publicidade paga nos principais marketplaces.', 'intermediário', 3);

-- Modules for Track 3
INSERT INTO public.track_modules (id, track_id, title, description, order_index) VALUES
('33333333-3333-3333-3333-333333333301', '33333333-3333-3333-3333-333333333333', 'Fundamentos de Ads em Marketplaces', 'Conceitos essenciais de mídia paga', 1),
('33333333-3333-3333-3333-333333333302', '33333333-3333-3333-3333-333333333333', 'Mercado Livre Ads (Product Ads)', 'Dominando Product Ads no ML', 2),
('33333333-3333-3333-3333-333333333303', '33333333-3333-3333-3333-333333333333', 'Amazon Ads (Sponsored Products)', 'Campanhas patrocinadas na Amazon', 3),
('33333333-3333-3333-3333-333333333304', '33333333-3333-3333-3333-333333333333', 'Shopee Ads e Shopee Afiliados', 'Tráfego pago na Shopee', 4),
('33333333-3333-3333-3333-333333333305', '33333333-3333-3333-3333-333333333333', 'Análise de Métricas e ACOS/TACOS', 'Métricas avançadas de performance', 5);

-- Lessons for Track 3
INSERT INTO public.track_lessons (module_id, title, description, duration_minutes, order_index) VALUES
-- Module 1: Fundamentos (4 aulas)
('33333333-3333-3333-3333-333333333301', 'Por que Investir em Ads?', 'ROI e benefícios da mídia paga', 18, 1),
('33333333-3333-3333-3333-333333333301', 'Tipos de Anúncios', 'Sponsored, Display, Video Ads', 22, 2),
('33333333-3333-3333-3333-333333333301', 'Orçamento e Lances', 'Como definir investimento inicial', 20, 3),
('33333333-3333-3333-3333-333333333301', 'Palavras-chave Básico', 'Pesquisa e seleção de keywords', 25, 4),
-- Module 2: ML Ads (6 aulas)
('33333333-3333-3333-3333-333333333302', 'Configurando Product Ads', 'Primeira campanha no ML', 25, 1),
('33333333-3333-3333-3333-333333333302', 'Estratégias de Lance', 'Manual vs Automático', 20, 2),
('33333333-3333-3333-3333-333333333302', 'Segmentação de Produtos', 'Escolhendo produtos para anunciar', 22, 3),
('33333333-3333-3333-3333-333333333302', 'Otimização de Campanhas', 'Ajustes para melhorar performance', 28, 4),
('33333333-3333-3333-3333-333333333302', 'Relatórios do ML Ads', 'Interpretando dados de campanhas', 20, 5),
('33333333-3333-3333-3333-333333333302', 'Casos de Sucesso ML', 'Exemplos reais de otimização', 15, 6),
-- Module 3: Amazon Ads (5 aulas)
('33333333-3333-3333-3333-333333333303', 'Sponsored Products 101', 'Introdução aos patrocinados', 22, 1),
('33333333-3333-3333-3333-333333333303', 'Sponsored Brands', 'Campanhas de marca', 25, 2),
('33333333-3333-3333-3333-333333333303', 'Targeting Automático vs Manual', 'Quando usar cada estratégia', 20, 3),
('33333333-3333-3333-3333-333333333303', 'Palavras Negativas', 'Economizando com negativação', 18, 4),
('33333333-3333-3333-3333-333333333303', 'Amazon Advertising Console', 'Navegando pela plataforma', 25, 5),
-- Module 4: Shopee Ads (4 aulas)
('33333333-3333-3333-3333-333333333304', 'Shopee Ads Básico', 'Primeiros anúncios na Shopee', 18, 1),
('33333333-3333-3333-3333-333333333304', 'Discovery Ads', 'Anúncios de descoberta', 20, 2),
('33333333-3333-3333-3333-333333333304', 'Search Ads', 'Anúncios de busca', 22, 3),
('33333333-3333-3333-3333-333333333304', 'Programa de Afiliados', 'Usando afiliados para vender mais', 25, 4),
-- Module 5: Métricas (4 aulas)
('33333333-3333-3333-3333-333333333305', 'ACOS e TACOS Explicados', 'Entendendo as métricas principais', 25, 1),
('33333333-3333-3333-3333-333333333305', 'ROAS e Break-even', 'Calculando retorno sobre investimento', 22, 2),
('33333333-3333-3333-3333-333333333305', 'Dashboards de Performance', 'Criando relatórios visuais', 28, 3),
('33333333-3333-3333-3333-333333333305', 'Otimização Contínua', 'Processo de melhoria constante', 20, 4);

-- Insert Track 4: Gestão Financeira
INSERT INTO public.learning_tracks (id, title, description, level, order_index)
VALUES ('44444444-4444-4444-4444-444444444444', 'Gestão Financeira do Negócio', 'Controle suas finanças e maximize seus lucros.', 'todos', 4);

-- Modules for Track 4
INSERT INTO public.track_modules (id, track_id, title, description, order_index) VALUES
('44444444-4444-4444-4444-444444444401', '44444444-4444-4444-4444-444444444444', 'Fluxo de Caixa na Prática', 'Controle de entradas e saídas', 1),
('44444444-4444-4444-4444-444444444402', '44444444-4444-4444-4444-444444444444', 'DRE e Indicadores Financeiros', 'Demonstrativo de resultados', 2),
('44444444-4444-4444-4444-444444444403', '44444444-4444-4444-4444-444444444444', 'Precificação Avançada', 'Técnicas avançadas de preço', 3),
('44444444-4444-4444-4444-444444444404', '44444444-4444-4444-4444-444444444444', 'Tributação para E-commerce', 'Impostos e enquadramento', 4),
('44444444-4444-4444-4444-444444444405', '44444444-4444-4444-4444-444444444444', 'Planejamento e Metas', 'Metas financeiras e planejamento', 5);

-- Lessons for Track 4
INSERT INTO public.track_lessons (module_id, title, description, duration_minutes, order_index) VALUES
-- Module 1: Fluxo de Caixa (4 aulas)
('44444444-4444-4444-4444-444444444401', 'O que é Fluxo de Caixa', 'Conceitos fundamentais', 18, 1),
('44444444-4444-4444-4444-444444444401', 'Planilha de Fluxo de Caixa', 'Modelo prático para usar', 25, 2),
('44444444-4444-4444-4444-444444444401', 'Projeção de Caixa', 'Prevendo o futuro financeiro', 22, 3),
('44444444-4444-4444-4444-444444444401', 'Capital de Giro', 'Quanto preciso para operar?', 20, 4),
-- Module 2: DRE (4 aulas)
('44444444-4444-4444-4444-444444444402', 'Entendendo a DRE', 'Estrutura do demonstrativo', 25, 1),
('44444444-4444-4444-4444-444444444402', 'Margem de Contribuição', 'Quanto cada produto contribui', 22, 2),
('44444444-4444-4444-4444-444444444402', 'Ponto de Equilíbrio', 'Quando começo a lucrar?', 20, 3),
('44444444-4444-4444-4444-444444444402', 'Indicadores KPI', 'Métricas para acompanhar', 25, 4),
-- Module 3: Precificação (3 aulas)
('44444444-4444-4444-4444-444444444403', 'Markup vs Margem', 'Diferenças e aplicações', 20, 1),
('44444444-4444-4444-4444-444444444403', 'Precificação Dinâmica', 'Ajustando preços por demanda', 25, 2),
('44444444-4444-4444-4444-444444444403', 'Guerra de Preços', 'Como não entrar e como sair', 22, 3),
-- Module 4: Tributação (5 aulas)
('44444444-4444-4444-4444-444444444404', 'MEI, Simples e Lucro Presumido', 'Qual regime escolher?', 28, 1),
('44444444-4444-4444-4444-444444444404', 'ICMS para E-commerce', 'Imposto sobre circulação', 25, 2),
('44444444-4444-4444-4444-444444444404', 'Substituição Tributária', 'O que é ST e como funciona', 22, 3),
('44444444-4444-4444-4444-444444444404', 'Nota Fiscal Eletrônica', 'Emissão e obrigações', 20, 4),
('44444444-4444-4444-4444-444444444404', 'Planejamento Tributário', 'Pague menos legalmente', 30, 5),
-- Module 5: Planejamento (3 aulas)
('44444444-4444-4444-4444-444444444405', 'Definindo Metas SMART', 'Metas específicas e alcançáveis', 20, 1),
('44444444-4444-4444-4444-444444444405', 'Orçamento Anual', 'Planejando o ano financeiro', 25, 2),
('44444444-4444-4444-4444-444444444405', 'Reserva de Emergência', 'Proteção para seu negócio', 18, 3);

-- Insert Track 5: Escala e Automação
INSERT INTO public.learning_tracks (id, title, description, level, order_index)
VALUES ('55555555-5555-5555-5555-555555555555', 'Escala e Automação', 'Escale seu negócio e automatize processos.', 'avançado', 5);

-- Modules for Track 5
INSERT INTO public.track_modules (id, track_id, title, description, order_index) VALUES
('55555555-5555-5555-5555-555555555501', '55555555-5555-5555-5555-555555555555', 'Processos e SOPs', 'Documentando procedimentos', 1),
('55555555-5555-5555-5555-555555555502', '55555555-5555-5555-5555-555555555555', 'Contratação e Gestão de Equipe', 'Montando seu time', 2),
('55555555-5555-5555-5555-555555555503', '55555555-5555-5555-5555-555555555555', 'Ferramentas de Automação', 'Tecnologia para escalar', 3),
('55555555-5555-5555-5555-555555555504', '55555555-5555-5555-5555-555555555555', 'Expansão para Novos Canais', 'Crescendo além dos marketplaces', 4),
('55555555-5555-5555-5555-555555555505', '55555555-5555-5555-5555-555555555555', 'Do Operacional ao Estratégico', 'Virando CEO do seu negócio', 5);

-- Lessons for Track 5
INSERT INTO public.track_lessons (module_id, title, description, duration_minutes, order_index) VALUES
-- Module 1: SOPs (4 aulas)
('55555555-5555-5555-5555-555555555501', 'O que são SOPs', 'Procedimentos operacionais padrão', 18, 1),
('55555555-5555-5555-5555-555555555501', 'Mapeando Processos', 'Identificando o que documentar', 25, 2),
('55555555-5555-5555-5555-555555555501', 'Criando SOPs Eficientes', 'Passo a passo para documentar', 28, 3),
('55555555-5555-5555-5555-555555555501', 'Treinando com SOPs', 'Usando para onboarding', 20, 4),
-- Module 2: Equipe (5 aulas)
('55555555-5555-5555-5555-555555555502', 'Quando Contratar', 'Sinais de que é hora', 20, 1),
('55555555-5555-5555-5555-555555555502', 'Primeiro Funcionário', 'Quem contratar primeiro', 22, 2),
('55555555-5555-5555-5555-555555555502', 'Processo Seletivo', 'Como entrevistar e selecionar', 25, 3),
('55555555-5555-5555-5555-555555555502', 'CLT, PJ ou Freelancer', 'Qual modelo de contratação', 28, 4),
('55555555-5555-5555-5555-555555555502', 'Gestão de Pessoas', 'Liderança para pequenos times', 25, 5),
-- Module 3: Automação (4 aulas)
('55555555-5555-5555-5555-555555555503', 'ERPs e Hubs', 'Sistemas de gestão integrada', 25, 1),
('55555555-5555-5555-5555-555555555503', 'Automação de Atendimento', 'Chatbots e respostas automáticas', 22, 2),
('55555555-5555-5555-5555-555555555503', 'Automação de Preços', 'Repricers e precificação dinâmica', 25, 3),
('55555555-5555-5555-5555-555555555503', 'Integração de Sistemas', 'Conectando suas ferramentas', 28, 4),
-- Module 4: Expansão (4 aulas)
('55555555-5555-5555-5555-555555555504', 'Loja Virtual Própria', 'Quando sair dos marketplaces', 25, 1),
('55555555-5555-5555-5555-555555555504', 'Social Commerce', 'Vendendo nas redes sociais', 22, 2),
('55555555-5555-5555-5555-555555555504', 'B2B e Atacado', 'Vendendo para empresas', 28, 3),
('55555555-5555-5555-5555-555555555504', 'Internacionalização', 'Vendendo para outros países', 30, 4),
-- Module 5: Estratégico (3 aulas)
('55555555-5555-5555-5555-555555555505', 'Delegando Operação', 'Soltando as tarefas do dia a dia', 25, 1),
('55555555-5555-5555-5555-555555555505', 'Visão Estratégica', 'Pensando no longo prazo', 28, 2),
('55555555-5555-5555-5555-555555555505', 'Construindo um Negócio Vendável', 'Preparando para vender ou escalar', 30, 3);