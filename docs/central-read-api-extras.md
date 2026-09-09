# central-read-api — Rotas complementares (gamificação, IA, catálogo, compliance, ops)

Base: `https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/central-read-api`
Auth: header `x-api-key: <CENTRAL_READ_API_KEY>` (sem ela → 401). Só GET.

Envelope: `{ data, meta }`. Rotas paginadas aceitam `?page=` e `?per_page=` (default 100, máx 500)
e `?since=<ISO>` / `?updated_since=<ISO>` para sync incremental.
Equipe interna excluída por default (`?include_internal=true` para incluir) — a exclusão usa a
lista fixa de IDs internos **mais** todos os usuários com role de staff.

## Rotas

| Rota | Conteúdo | Paginada |
|---|---|---|
| `/gamification/leaderboard` | ranking (top 50) com `total_points`, `achievements_count`, nome e avatar | não |
| `/gamification/achievements` | catálogo das conquistas + `users_unlocked` por conquista | não |
| `/gamification/user-achievements?since=` | desbloqueios por membro (`progress`, `unlocked_at`) | sim |
| `/ai/mapinha?days=30` | painel completo do Mapinha: `summary` (perguntas, usuários, taxa de sucesso, latência média, uso de busca web, notas), `daily`, `topics`, `top_users`, `repeated_questions`, `recent`, `hours` | não |
| `/ai/mapinha/interactions?since=` | interações cruas (pergunta, tópico, status, latência, buscas web, nota) — sem a resposta gerada | sim |
| `/certificates?since=` | certificados emitidos: `user_id`, `formation_id`, `formation_title`, `certificate_number`, `completed_at` | sim |
| `/events/checkins?kind=webinar\|mentoring&since=` | check-ins por membro com `event_title`, `event_scheduled_at`, `event_host`, `max_attendees` | sim |
| `/catalog` | `formations`, `content_tracks`, `content_items`, `resources` (títulos, ordem, status, `is_coming_soon`) — sem URLs de vídeo | não |
| `/benefits/extra?since=` | benefícios extras: tipo, título, quantidade concedida/usada, status, validade | sim |
| `/benefits/cashback?since=` | usos de cashback: parceiro, % de desconto, valor da compra, cashback, status | sim |
| `/plan-upgrades?since=` | upgrades de plano: plano atual/novo, valores, parcelas, status, datas | sim |
| `/compliance/terms?since=` | aceite dos termos: versão e data | sim |
| `/compliance/image-consent?since=` | consentimento de imagem em mentorias: versão, sessão e data | sim |
| `/secondary-logins?since=` | contas parceiras: `primary_user_id`, `secondary_user_id`, e-mail, relação, ativo | sim |
| `/networking/connections?since=` | conexões entre membros (`follower_id` → `following_id`) | sim |
| `/ops/health?days=30` | saúde de integrações: `webhooks.by_event` (provider/evento/status/contagem), `webhooks.recent_failures` (até 50) e `churn_alerts` | não |

Nunca expostos em nenhuma dessas rotas: telefone (só em `/members` e `/phones`), URL de vídeo,
IDs de pagamento (Stripe/Asaas), conteúdo de mensagens privadas e senhas/tokens.

## Prompt para o "MAP Centralizador de Dados"

> Estenda a edge function de proxy já existente (`acelera-analytics` / `acelera-marketing`) para
> também repassar os novos namespaces da API de leitura da Comunidade:
> `gamification/*`, `ai/mapinha`, `certificates`, `events/checkins`, `catalog`, `benefits/*`,
> `plan-upgrades`, `compliance/*`, `secondary-logins`, `networking/connections`, `ops/health`.
> Mesma regra: `x-api-key: ACELERA_READ_API_KEY` no servidor, JWT + role admin validados antes de
> repassar, resposta `{ data, meta }` intacta.
>
> No frontend, adicione dentro das abas que já existem (React Query, cache 5 min, pt-BR):
> - **Engajamento**: cards de gamificação (`/gamification/leaderboard` como tabela de ranking e
>   `/gamification/achievements` como barra de conquistas mais/menos desbloqueadas) e tabela de
>   presenças de `/events/checkins` com filtro webinar/mentoria.
> - **Produto/IA**: bloco do Mapinha usando `/ai/mapinha` — KPIs (perguntas, usuários únicos, taxa de
>   sucesso, latência média, % com busca web), série diária, top tópicos e perguntas repetidas.
> - **Sucesso do cliente**: `/certificates` (emissões por formação e por mês), `/benefits/extra` e
>   `/benefits/cashback` (status e valores), `/plan-upgrades` (funil de upgrade),
>   `/secondary-logins` (contas parceiras por conta primária).
> - **Compliance**: `/compliance/terms` e `/compliance/image-consent` — cobertura de aceite sobre o
>   total de membros.
> - **Operação**: `/ops/health` — tabela de webhooks por evento/status e lista de falhas recentes,
>   mais alertas de churn do período.
> - **Catálogo**: `/catalog` para nomear formações/trilhas/itens nos gráficos em vez de exibir IDs.
>
> Join com o CRM por e-mail em `LOWER()` ou por `user_id` da Comunidade. A equipe interna já vem
> excluída pela API. Timestamps em UTC ISO-8601. Skeleton no loading e `error.message` quando != 200.
