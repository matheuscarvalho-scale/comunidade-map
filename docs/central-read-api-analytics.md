# central-read-api — Métricas de Engajamento

Base: `https://tcncngawqeudwjxgcvia.supabase.co/functions/v1/central-read-api`
Auth: header `x-api-key: <CENTRAL_READ_API_KEY>` (sem ela → 401). Só GET.

Todas as rotas de analytics respondem `{ "data": ..., "meta": { "generated_at": ISO } }`.
As rotas paginadas (`inactive-members`, `onboarding-responses`, `events`) respondem
`{ "data": [...], "meta": { page, per_page, total, total_pages, has_more, generated_at } }`
e aceitam `?page=` e `?per_page=` (default 100, máx 500).

Parâmetros comuns: `?days=` (janela em dias, default 30), `?limit=` (default 50, máx 500),
`?include_internal=true` (inclui equipe interna; default false).

## Rotas

| Rota | Conteúdo (idêntico ao painel admin) |
|---|---|
| `/analytics/kpis?days=30` | total de eventos, usuários únicos, sessões, page views, hora/dia de pico, página top e os mesmos números do período anterior (para variação %) |
| `/analytics/engagement-stats` | `active_7d`, `inactive_30d`, `total_members`, `avg_session_seconds` |
| `/analytics/page-views-over-time?days=30` | série diária: `day`, `page_views`, `unique_users` |
| `/analytics/weekday-access?days=30` | por dia da semana: `day_of_week`, `day_name`, `page_views`, `unique_users` |
| `/analytics/access-heatmap?days=30` | heatmap dia da semana × hora |
| `/analytics/top-pages?days=30&limit=15` | `page_path`, `page_views`, `unique_users`, `avg_duration_seconds` |
| `/analytics/top-clicked-elements?days=30&limit=20&element_type=botao` | `label`, `element_type`, `page_path`, `click_count` |
| `/analytics/page-click-details?page_paths=/,/mentorias&days=30` | cliques detalhados por página (`label`, `element_type`, `category`, `click_count`) |
| `/analytics/formation-completion` | por formação: aulas, iniciaram, concluíram, `completion_rate` |
| `/analytics/track-completion` | mesmo shape por trilha de conteúdo |
| `/analytics/track-items/:track_id` | itens da trilha com `users_completed` (sem id = todas) |
| `/analytics/inactive-members?inactive_days=30` | membros inativos com `last_activity`, `days_inactive`, plano |
| `/analytics/onboarding-responses` | respostas de onboarding por membro |
| `/analytics/cashback` | `stats`, `partner_performance`, `saldo_por_plano` |
| `/analytics/page-name-map` | mapa rota→nome amigável, rótulos de tipo de elemento, formações e trilhas (id/título) para montar os mesmos labels do painel |
| `/analytics/events?since=<ISO>&event_type=click` | eventos crus de `member_analytics` (máx 5000 por chamada) para cálculos próprios |

`/engagement` (já existia) agora também traz, por membro: `avg_session_seconds`,
`page_views`, `clicks`, `first_access_at`.

Notas de paridade com o painel:
- Páginas `/admin*` são excluídas das métricas, como no painel.
- Duração de sessão é capada em 30 minutos por evento.
- Equipe interna é excluída por default em todas as rotas por membro.
- Timestamps em UTC ISO-8601; horários de pico já calculados em America/Sao_Paulo.

## Prompt para o projeto "MAP Centralizador de Dados"

> Crie uma aba **Analytics de Engajamento** idêntica à do MAP Acelera, consumindo a API
> de leitura já existente (não criar tabelas nem duplicar dados).
>
> **Backend**: crie uma edge function `acelera-analytics` que faz proxy autenticado para
> `https://tcncngawqeudwjxgcvia.supabase.co/functions/v1/central-read-api/analytics/<rota>`,
> repassando query params e adicionando o header `x-api-key: ACELERA_READ_API_KEY`
> (secret no projeto). A chave nunca vai para o frontend. Só admins podem chamar a
> function: valide o JWT e a role admin antes de repassar.
>
> **Frontend** (React + Vite + Tailwind + shadcn + Recharts + React Query), 4 abas:
> 1. **Visão Geral** — cards de KPI (eventos, usuários únicos, sessões, page views, hora
>    de pico, dia de pico, página top) com variação % vs. período anterior a partir de
>    `/kpis`; gráfico de linha diário de `/page-views-over-time`; barras por dia da semana
>    de `/weekday-access`; heatmap dia × hora de `/access-heatmap`; cards de
>    `/engagement-stats` (ativos 7d, inativos 30d, total de membros, duração média).
> 2. **Páginas e Cliques** — tabela de `/top-pages` (usando o mapa de nomes de
>    `/page-name-map` para exibir nome amigável em vez do path), tabela de
>    `/top-clicked-elements` com filtro por tipo de elemento, e modal de detalhe por
>    página chamando `/page-click-details`.
> 3. **Conteúdo** — barras de conclusão de `/formation-completion` e
>    `/track-completion`; ao clicar numa trilha, abrir `/track-items/:track_id`.
> 4. **Membros** — tabela paginada de `/inactive-members` (filtro de dias de
>    inatividade), tabela de `/onboarding-responses`, e blocos de `/cashback`.
>
> Filtro global de período (7 / 30 / 90 / 365 dias) aplicado como `?days=` em todas as
> chamadas que aceitam. Cache do React Query de 5 minutos. Estados de loading com
> skeleton e mensagem de erro amigável quando a API responder != 200 (mostrar o campo
> `error.message`). Formate números em pt-BR e durações em minutos/horas.

## CS 360 — engajamento por membro e progresso individual

### `/engagement` (campos já disponíveis)

Além de `sessions`, `total_minutes`, `last_access_at`, `lessons_completed`,
`mentoring_checkins`, `webinar_checkins`, cada linha já traz:
`first_access_at`, `page_views`, `clicks`, `avg_session_seconds`, `total_seconds`
e `updated_at` (última mudança em qualquer métrica ou no perfil — use com
`?updated_since=`). Sessões são capadas em 30 min, igual ao painel.

### `GET /progress`

Agregado por membro × trilha. Filtros: `?user_id=<uuid>`, `?page=`, `?per_page=`
(máx 500), `?updated_since=<ISO>`, `?include_internal=true`.

```json
{ "user_id": "uuid", "track_id": "uuid", "track_title": "Shopee",
  "track_type": "formacao", "lessons_total": 12, "lessons_completed": 3,
  "progress_percent": 25, "started_at": "...", "last_activity_at": "...",
  "completed_at": null, "updated_at": "..." }
```

`track_type`: `formacao` (formações), `trilha` (trilhas de conteúdo),
`mentoria_gravada` (trilha slug `mentorias`), `webinar_gravado` (slug `webinars`).
`track_id` é o id da formação ou da trilha — casa com `/catalog`, então o
conteúdo **não acessado** é o que está em `/catalog` e não aparece aqui.
`completed_at` só é preenchido quando `lessons_completed >= lessons_total`.

### `GET /progress/lessons`

Detalhe aula a aula (mesmos filtros): `user_id`, `lesson_id`, `lesson_title`,
`track_id`, `track_title`, `track_type`, `completed`, `completed_at`,
`watch_seconds` (sempre `null` — a plataforma não rastreia tempo assistido),
`created_at`, `updated_at`.
