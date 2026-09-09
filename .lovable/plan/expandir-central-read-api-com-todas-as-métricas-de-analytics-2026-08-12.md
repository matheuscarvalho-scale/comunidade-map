# Expandir `central-read-api` com todas as métricas de "Analytics de Engajamento"

Objetivo: o Centralizador conseguir reconstruir a aba "Analytics de Engajamento" exatamente como ela existe hoje aqui, consumindo só a API — sem divergência de números.

## O que a aba usa hoje (confirmado no código)

`src/pages/AdminAnalytics.tsx` (aba **Engajamento**), `src/components/analytics/ClicksDashboard.tsx` (aba **Cliques/Comportamento/Interações/Páginas**) e `src/components/analytics/OnboardingDashboard.tsx` (aba **Onboarding**) leem exclusivamente estas funções do banco:

| Função | Usada em | Parâmetros |
|---|---|---|
| `get_engagement_stats` | KPIs de engajamento | — |
| `get_inactive_members` | membros inativos + lista completa | `inactive_days`, `limit_count` |
| `get_top_pages` | páginas mais vistas (30d) | `days_back`, `limit_count` |
| `get_formation_completion_rates` | conclusão de formações | — |
| `get_content_track_completion_rates` | conclusão de trilhas | — |
| `get_content_item_completion_stats` | detalhe por item da trilha | `_track_id` |
| `get_analytics_kpis` | KPIs de cliques/acessos | `_days_ago` |
| `get_page_views_over_time` | série temporal de acessos | `_days_ago` |
| `get_weekday_access_summary` | acessos por dia da semana | `_days_ago` |
| `get_access_heatmap` | heatmap dia × hora | `_days_ago` |
| `get_top_pages_by_views` | ranking de páginas | `_days_ago`, `_limit` |
| `get_top_clicked_elements` | elementos mais clicados | `_days_ago`, `_limit` |
| `get_page_click_details` | cliques detalhados de uma página | `_page_paths`, `_days_ago` |
| `get_onboarding_responses` | respostas de onboarding | — |
| `get_cashback_dashboard_stats` / `get_cashback_partner_performance` / `get_cashback_saldo_planos` | cards de cashback da página | — |

Todas já excluem a equipe interna internamente, então os números da API vão bater com o painel.

## Novos endpoints na API (GET, read-only, mesmo contrato)

Base: `/functions/v1/central-read-api/...`, auth `x-api-key: CENTRAL_READ_API_KEY`, envelope `data` + `meta`.

Um namespace novo `/analytics/*`, cada rota chamando a função equivalente via service role e devolvendo os dados crus (sem reformatar nomes de página — o Centralizador aplica o próprio rótulo):

| Endpoint | Query params |
|---|---|
| `/analytics/kpis` | `days=30` |
| `/analytics/engagement-stats` | — |
| `/analytics/page-views-over-time` | `days` |
| `/analytics/weekday-access` | `days` |
| `/analytics/access-heatmap` | `days` |
| `/analytics/top-pages` | `days`, `limit` |
| `/analytics/top-clicked-elements` | `days`, `limit`, `element_type` |
| `/analytics/page-click-details` | `page_paths` (CSV), `days` |
| `/analytics/formation-completion` | — |
| `/analytics/track-completion` | — |
| `/analytics/track-items/:track_id` | — |
| `/analytics/inactive-members` | `inactive_days=0`, `limit=1000`, paginado |
| `/analytics/onboarding-responses` | paginado |
| `/analytics/cashback` | — (stats + performance por parceiro + saldo por plano) |

Extras para não divergir e permitir cortes próprios no Centralizador:

- `/analytics/page-name-map` — devolve o mapa de rotas → nome amigável, além de formações (`id`→`title`) e trilhas (`id`/`slug`→`title`), que é exatamente o que a UI de hoje usa para nomear páginas.
- `/engagement` (já existente) ganha `page_views`, `clicks`, `first_access` e `avg_session_seconds` por membro, mantendo os campos atuais.
- `/analytics/events` — leitura paginada e incremental de `member_analytics` (`since`, `updated_since`, `event_type`) para o Centralizador manter uma cópia própria e cruzar com dados do CRM.

Regras mantidas: `include_internal=false` por default, timestamps UTC ISO-8601, `per_page` máx 500, erros `{ error: { code, message } }`, nenhuma URL de vídeo ou ID de pagamento exposto.

## Detalhes técnicos

- Editar `supabase/functions/central-read-api/index.ts` com um bloco de roteamento `analytics` e um helper genérico `rpcResource(name, args)` em `lib.ts` que chama a função, trata erro e devolve `{ data, meta }`.
- Adicionar `parseIntParam(url, name, default, max)` em `lib.ts` para `days` / `limit`.
- Nenhuma migração de banco: todas as funções já existem.
- Sem mudança de front-end neste projeto.
- Documentar os endpoints em `docs/central-read-api-phone-review-reasons.md` (ou arquivo novo `docs/central-read-api-analytics.md`).

## Prompt para o projeto "MAP Centralizador de Dados"

Ao final, entrego no chat um prompt pronto para colar lá, contendo:

1. Item novo na sidebar: **Analytics de Engajamento**, rota `/analytics-engajamento`, com as 3 sub-abas (Engajamento, Cliques, Onboarding) e as mesmas sub-abas internas de cliques (Visão Geral, Comportamento, Interações, Páginas).
2. Cada card/gráfico com o endpoint exato da API da Comunidade que o alimenta, o shape do JSON e o gráfico correspondente (recharts: `AreaChart` da série temporal, `BarChart` por dia da semana, grid de heatmap dia × hora, tabelas de páginas/elementos/membros inativos).
3. Como autenticar (`x-api-key` guardado como secret no Centralizador, chamada feita por edge function server-side — nunca do browser) e a URL base da função.
4. Como unir com os dados do CRM já coletados lá (join por email em `LOWER()` e por `user_id` da Comunidade), e a nota de que a equipe interna já vem excluída.
