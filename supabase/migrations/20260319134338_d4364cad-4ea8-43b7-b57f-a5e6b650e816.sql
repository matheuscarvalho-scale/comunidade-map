
-- Insert 3 Formations
INSERT INTO public.formations (id, title, description, level, order_index, is_coming_soon, is_published, thumbnail_url)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Iniciante: Os Primeiros 120 Dias', 'Sobrevivência e Tração — Para quem tem loja no ar mas ainda não tem visitantes nem vendas.', 'Iniciante', 1, false, true, null),
  ('a1000000-0000-0000-0000-000000000002', 'Intermediário: Vendendo, mas Faturando Pouco', 'Otimização e Lucro — Para quem já vende mas sofre com margem baixa e ROAS ruim.', 'Intermediário', 2, false, true, null),
  ('a1000000-0000-0000-0000-000000000003', 'Avançado: Como Escalar Sem Quebrar', 'Expansão e Gestão — Para quem tem volume de vendas consistente e precisa escalar sem quebrar o caixa.', 'Avançado', 3, false, true, null);

-- Modules (1 module per formation)
INSERT INTO public.formation_modules (id, formation_id, title, description, order_index)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Módulo 1 — Fundamentos', 'Estruturação, precificação, produto e tráfego inicial.', 1),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Módulo 1 — Otimização', 'Tráfego estratégico, logística, ticket médio e ofertas.', 1),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'Módulo 1 — Escala', 'Finanças, CRO, equipe e omnichannel.', 1);

-- Lessons Track 1
INSERT INTO public.formation_lessons (id, module_id, title, description, order_index, duration_minutes)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Estruturação e Lançamento à Prova de Falhas', 'Como montar sua loja e lançar de forma segura nos primeiros dias.', 1, 30),
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'O Guia Definitivo de Precificação para E-commerce', 'Aprenda a precificar corretamente para garantir margem saudável.', 2, 25),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'Encontrando o Produto Best-Seller', 'Técnicas para identificar e validar seu produto campeão de vendas.', 3, 20),
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 'Primeiros Passos no Tráfego Pago (Saindo do Zero)', 'Como criar suas primeiras campanhas de anúncios com orçamento reduzido.', 4, 35);

-- Lessons Track 2
INSERT INTO public.formation_lessons (id, module_id, title, description, order_index, duration_minutes)
VALUES
  ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000002', 'Tráfego Pago Estratégico e Otimização de ROAS', 'Estratégias avançadas para maximizar o retorno sobre investimento em ads.', 1, 30),
  ('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000002', 'Gestão de Estoque e Logística Eficiente', 'Como evitar rupturas e reduzir custos logísticos.', 2, 25),
  ('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000002', 'Aumentando o Ticket Médio e o LTV', 'Táticas para vender mais por pedido e reter clientes por mais tempo.', 3, 25),
  ('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000002', 'Criação de Ofertas Irresistíveis', 'Como estruturar ofertas que convertem e geram urgência real.', 4, 20);

-- Lessons Track 3
INSERT INTO public.formation_lessons (id, module_id, title, description, order_index, duration_minutes)
VALUES
  ('c1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000003', 'Engenharia Financeira e Fluxo de Caixa para Escala', 'Controle financeiro para crescer sem quebrar o caixa.', 1, 35),
  ('c1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000003', 'Otimização Avançada de Funil (CRO)', 'Como aumentar taxas de conversão em cada etapa do funil.', 2, 30),
  ('c1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000003', 'Estruturação de Equipe e Automação de Processos', 'Quando e como contratar, delegar e automatizar operações.', 3, 30),
  ('c1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000003', 'Omnichannel e Expansão de Canais', 'Estratégias para expandir para múltiplos canais de venda.', 4, 25);
