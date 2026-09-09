# Aba "Marketing" no Centralizador — dados e API

Resposta curta: sim, dá para montar uma aba de Marketing bem completa com o que já existe na plataforma, mas **hoje a `central-read-api` não expõe isso de forma pronta**. Ela tem `/members`, `/onboarding`, `/subscriptions`, `/engagement`, `/phones`, `/deletions` e `/analytics/*` (métricas de engajamento/cliques). Falta um namespace `/marketing/*` que entregue os números já agregados.

## O que temos hoje (verificado no banco)

| Fonte | Volume atual | Serve para |
|---|---|---|
| `user_onboarding` (35 campos: nicho, canais de venda, plataforma, ERP, IA, ticket médio, faturamento-meta, funcionários, cidade/UF, cargo, CNPJ) | 130 respostas | Perfil de ICP, segmentação, personas |
| `member_attribution` (utm_source/medium/campaign/content/term, gclid, fbclid, referrer, landing_page, source_type, origin) | 3 registros, **0 com UTM** | Canal de aquisição — estrutura pronta, dado ainda vazio |
| `payment_events` | 1.456 eventos | Receita, primeira compra, churn/chargeback, ticket por plano |
| `plan_upgrades` | histórico de upgrades | Expansão de receita (upsell) |
| `partner_clicks` (com utm_source/medium/campaign, valor de compra, cashback) | 63 cliques | Performance de parceiros/benefícios como canal |
| `vendas` + `vendedores` | 1 / 2 | Vendas por afiliado/vendedor |
| `mapinha_interactions` (topic, rating, web_search_count) | 13 | Temas de interesse dos membros (insumo de conteúdo/campanha) |
| `webinar_checkins`, `mentoring_checkins`, `webinars` | ativos | Conversão de evento: inscritos → presentes |
| `member_analytics` (195 mil eventos) | page_view, click, page_duration | Já exposto em `/analytics/*` |

Limitação honesta: **atribuição de canal está praticamente vazia** (nenhum registro com UTM). A captura já existe no código, mas os links de campanha não vêm marcados. Sem taguear os links de anúncio/e-mail/bio, a aba de Marketing terá funil e ICP ricos, mas "origem por canal" ficará quase toda como "direto/desconhecido".

## Novos endpoints `/marketing/*` na `central-read-api`

Mesmo contrato atual: só GET, `x-api-key`, envelope `{ data, meta }`, `?days=` (default 30), equipe interna excluída por default.

| Endpoint | Conteúdo |
|---|---|
| `/marketing/overview` | KPIs do período: novos membros, primeiros pagamentos, receita nova, receita recorrente, upgrades, cancelamentos/chargebacks, ticket médio, LTV médio aproximado |
| `/marketing/acquisition` | membros agrupados por `source_type`, `utm_source`, `utm_medium`, `utm_campaign`, referrer e landing page, com receita associada a cada grupo |
| `/marketing/funnel` | cadastro → onboarding iniciado → onboarding concluído → primeiro acesso → primeiro pagamento → ativo 7d, com taxa de conversão em cada etapa |
| `/marketing/cohorts` | coortes mensais de entrada: tamanho, retidos por mês, receita acumulada |
| `/marketing/revenue-timeseries` | série diária/mensal de receita, novos pagantes, upgrades e perdas |
| `/marketing/icp` | distribuições do onboarding: nicho, canais de venda, plataforma de e-commerce, ERP, uso de IA, ticket médio, faixa de funcionários, cidade/UF, cargo, meta de faturamento |
| `/marketing/plans` | mix de planos: membros e receita por plano, migrações entre planos |
| `/marketing/partners` | cliques por parceiro, valor de compra, cashback gerado, UTMs dos cliques |
| `/marketing/sellers` | vendas por vendedor/afiliado com valor e status |
| `/marketing/content-interest` | tópicos mais perguntados ao Mapinha + conteúdos/trilhas mais consumidos (reaproveitando `/analytics`) |
| `/marketing/events-conversion` | por webinar/mentoria: inscritos, check-ins, taxa de presença |
| `/marketing/geo` | membros e receita por cidade/UF (de `user_onboarding.city_state`) |

Nada de dado sensível: sem URL de vídeo, sem ID de pagamento, sem telefone nessas rotas.

## Detalhes técnicos

- Editar `supabase/functions/central-read-api/index.ts` com o bloco `marketing` de roteamento, reaproveitando `parseIntParam`, `paginated`, `INTERNAL_USER_IDS` e o filtro `include_internal` do `lib.ts`.
- Criar funções SQL agregadoras onde o cálculo é pesado (`get_marketing_overview`, `get_marketing_funnel`, `get_marketing_cohorts`, `get_marketing_acquisition`, `get_onboarding_icp_distribution`), `security definer` com `search_path = public`, e as rotas só chamam a função — mesmo padrão do `/analytics`.
- Joins de e-mail sempre com `LOWER()`; timestamps UTC ISO-8601.
- Documentar em `docs/central-read-api-marketing.md`.
- Sem mudança de front-end nesta plataforma.

## Melhorar a atribuição (opcional, recomendado)

Para a aba de aquisição ter valor real: taguear todos os links externos com `?utm_source=...&utm_medium=...&utm_campaign=...` (anúncios, e-mails Resend, bio, WhatsApp) e garantir que o UTM sobreviva do primeiro toque público até o cadastro. Posso incluir esse ajuste de captura no mesmo entrega, se quiser.

## Prompt para o "MAP Centralizador de Dados"

A aba **Marketing** já existe lá e hoje consome outra fonte — então o prompt não cria sidebar nem página nova. Ele descreve como **acrescentar a fonte "Plataforma"** dentro da aba existente: um filtro/toggle de fonte (ex.: "Todas / CRM / Plataforma"), os novos endpoints `/marketing/*` que alimentam cada card quando "Plataforma" está selecionada, o shape do JSON de cada rota, os gráficos sugeridos, e como autenticar via edge function proxy com a `x-api-key` guardada como secret (nunca no browser). Inclui também a nota de que a equipe interna já vem excluída e como cruzar com o CRM (join por e-mail em `LOWER()`), para os cards que combinam as duas fontes.

