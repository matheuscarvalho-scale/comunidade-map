# central-read-api — Métricas de Marketing

Base: `https://tcncngawqeudwjxgcvia.supabase.co/functions/v1/central-read-api`
Auth: header `x-api-key: <CENTRAL_READ_API_KEY>` (sem ela → 401). Só GET.
Envelope: `{ "data": ..., "meta": { "generated_at": ISO } }`.

Parâmetro comum: `?days=` (janela em dias; `0` = todo o histórico onde faz sentido).
A equipe interna (roles admin/cx/comercial/marketing/automacao) é sempre excluída.
Receita vem de `payment_events` com `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`, cruzada por e-mail em `LOWER()`.

## Rotas

| Rota | Conteúdo |
|---|---|
| `/marketing/overview?days=30` | `new_members`, `total_members`, `active_members`, `first_payments`, `new_revenue`, `total_revenue`, `payments_count`, `unique_payers`, `avg_ticket`, `upgrades`, `cancellations`, `lifetime_revenue`, `ltv_avg` |
| `/marketing/acquisition?days=0` | `members_total`, `members_with_attribution`, `attribution_coverage_pct` e `groups[]` com `{ dimension, value, members, revenue }` para `source_type`, `utm_source`, `utm_medium`, `utm_campaign`, `referrer`, `landing_page` |
| `/marketing/funnel?days=0` | `steps[]`: cadastro → onboarding iniciado → onboarding concluído → primeiro acesso → primeiro pagamento → ativo 7d |
| `/marketing/cohorts` | por mês de entrada: `members`, `paying_members`, `revenue`, `still_active`, `active_7d` |
| `/marketing/revenue-timeseries?days=180&granularity=day\|month` | `bucket`, `revenue`, `payments`, `unique_payers`, `new_payers` |
| `/marketing/icp` | `responses_total`, `completed_total`, `with_cnpj` e `distributions[]` `{ dimension, value, count }` (nicho, canais de venda, plataforma, ERP, IA, ticket médio, funcionários, cargo, metas, cidade/UF) |
| `/marketing/plans` | `mix` (plano × status × membros), `revenue_by_plan`, `transitions` (upgrades de plano) |
| `/marketing/partners?days=0` | por parceiro: `clicks`, `unique_users`, `purchases`, `purchase_value`, `cashback_value`, `utm_sources` |
| `/marketing/sellers?days=0` | por vendedor/afiliado: `sales`, `gross_value`, `commission_value` |
| `/marketing/content-interest?days=90` | tópicos mais perguntados ao Mapinha: `questions`, `unique_users`, `avg_rating`, `web_searches` |
| `/marketing/events-conversion?days=180` | webinars e mentorias: `checkins`, `max_attendees`, `fill_rate` |
| `/marketing/geo` | por cidade/UF: `members`, `paying_members`, `revenue` |

Nenhuma rota expõe telefone, URL de vídeo ou ID de pagamento.

## Limitação atual de atribuição

`member_attribution` está praticamente vazia (cobertura de ~1,5% e nenhum UTM), porque os links
de campanha ainda não vêm marcados. `/marketing/acquisition` já devolve `attribution_coverage_pct`
para a UI avisar disso. Para a aquisição por canal virar dado confiável, todos os links externos
(anúncios, e-mails, bio, WhatsApp) precisam de `?utm_source=...&utm_medium=...&utm_campaign=...`.

## Prompt para o "MAP Centralizador de Dados"

> Na aba **Marketing** que já existe, adicione a fonte **Plataforma (MAP Acelera)** — sem criar
> item de sidebar nem página nova, e sem duplicar dados em tabelas locais.
>
> **Filtro de fonte**: no topo da aba, um seletor "Fonte: Todas / CRM / Plataforma". Quando
> "Plataforma" (ou "Todas") estiver ativo, os cards e gráficos abaixo passam a consumir a API de
> leitura da Comunidade. Mantenha o filtro global de período aplicado como `?days=` (7/30/90/365/todo).
>
> **Backend**: edge function `acelera-marketing` que faz proxy autenticado para
> `https://tcncngawqeudwjxgcvia.supabase.co/functions/v1/central-read-api/marketing/<rota>`,
> repassando query params e adicionando `x-api-key: ACELERA_READ_API_KEY` (secret do projeto,
> nunca no browser). Valide JWT + role admin antes de repassar. Resposta sempre `{ data, meta }`.
>
> **Frontend** (React + Vite + Tailwind + shadcn + Recharts + React Query, cache 5 min):
> - **Cards de topo** de `/marketing/overview`: novos membros, primeiros pagamentos, receita nova,
>   receita total, ticket médio, upgrades, cancelamentos, LTV médio (formato pt-BR, R$).
> - **Aquisição** de `/marketing/acquisition`: barras por `utm_source`, `utm_medium`, `utm_campaign`
>   e `source_type` (membros e receita), tabela de referrer/landing page, e um alerta discreto
>   quando `attribution_coverage_pct` < 50% ("atribuição parcial: links sem UTM").
> - **Funil** de `/marketing/funnel`: gráfico de funil/barras com taxa de conversão entre etapas.
> - **Coortes** de `/marketing/cohorts`: tabela mês a mês com membros, pagantes, receita e ativos.
> - **Receita** de `/marketing/revenue-timeseries` (`granularity=day|month`): AreaChart de receita
>   com linha de novos pagantes.
> - **ICP** de `/marketing/icp`: grid de gráficos de barras horizontais por `dimension`
>   (nicho, canais de venda, plataforma, ERP, IA, ticket médio, funcionários, cargo, metas).
> - **Planos** de `/marketing/plans`: mix de planos empilhado por status, receita por plano e
>   tabela de migrações de plano.
> - **Parceiros e Vendedores** de `/marketing/partners` e `/marketing/sellers`: tabelas ordenáveis.
> - **Conteúdo e Eventos** de `/marketing/content-interest` e `/marketing/events-conversion`:
>   tópicos mais perguntados e tabela de webinars/mentorias com taxa de presença.
> - **Geografia** de `/marketing/geo`: tabela/ranking por cidade-UF com membros e receita.
>
> Notas: a equipe interna já vem excluída pela API; para cards que combinam CRM + Plataforma, faça
> o join por e-mail em `LOWER()`; timestamps em UTC ISO-8601; skeletons no loading e mensagem
> amigável usando `error.message` quando a API responder != 200.
