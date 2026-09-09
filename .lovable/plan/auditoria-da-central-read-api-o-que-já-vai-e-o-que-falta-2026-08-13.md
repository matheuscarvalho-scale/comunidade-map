# Auditoria da `central-read-api`: o que já vai e o que falta

Verifiquei rota por rota da função `central-read-api` contra as telas e tabelas da plataforma.

## Já coberto (nada a fazer)

- **Membros / assinaturas / onboarding / telefones / exclusões**: `/members`, `/members/:id`, `/subscriptions`, `/onboarding`, `/phones`, `/deletions`.
- **Aba "Analytics de Engajamento" (Engajamento + Cliques + Onboarding)**: paridade total. Todas as funções que a tela usa (`get_analytics_kpis`, `get_engagement_stats`, `get_page_views_over_time`, `get_weekday_access_summary`, `get_access_heatmap`, `get_top_pages`, `get_top_pages_by_views`, `get_top_clicked_elements`, `get_page_click_details`, `get_formation_completion_rates`, `get_content_track_completion_rates`, `get_content_item_completion_stats`, `get_inactive_members`, `get_onboarding_responses`, cashback) estão expostas em `/analytics/*`, mais `/analytics/events` e `/analytics/page-name-map`.
- **Marketing**: as 12 rotas `/marketing/*` (overview, acquisition, funnel, cohorts, revenue-timeseries, icp, plans, partners, sellers, content-interest, events-conversion, geo).

## Lacunas encontradas (com dados reais no banco hoje)

| Área | Dados existentes | Situação |
|---|---|---|
| Gamificação / ranking | 22 conquistas, 526 desbloqueios, função `get_leaderboard_with_achievements` usada no app | **não exposto** |
| Mapinha (IA) — painel Dona Olga | 13 interações, `get_mapinha_analytics` (perguntas, notas, buscas web) | **não exposto** (só o recorte de tópicos em `/marketing/content-interest`) |
| Certificados | 27 emitidos | **não exposto** |
| Presenças em eventos, por membro | 80 check-ins de mentoria, 22 de webinar | só agregado por evento em `/marketing/events-conversion` |
| Catálogo de conteúdo | 7 formações, 13 trilhas, 14 recursos | só taxas de conclusão; sem catálogo/estrutura |
| Cashback por membro | 1 uso registrado | só agregados em `/analytics/cashback` |
| Benefícios extras | 19 registros | **não exposto** |
| Logins secundários | 15 registros | **não exposto** |
| Upgrades de plano (detalhe) | 1 registro | só contagem no overview |
| Aceite de termos / consentimento de imagem | 102 / 55 | **não exposto** |
| Saúde de webhooks / churn | 1.480 logs, 14 alertas de churn | **não exposto** |
| Notificações | 299 | **não exposto** |
| Networking | 63 conexões (mensagens são criptografadas) | **não exposto** |

Sem dado hoje (0 linhas), então sem urgência: comunidade (posts/likes/respostas), sugestões, `video_progress`.

## Proposta de implementação (fase 1, o que tem valor de gestão)

Novas rotas GET em `central-read-api`, mesmo contrato (`x-api-key`, envelope `data` + `meta`, paginação, equipe interna excluída):

1. `/gamification/leaderboard` e `/gamification/achievements` — ranking com pontos/nível e catálogo + contagem de desbloqueios; `/gamification/user-achievements` paginado e incremental (`updated_since`).
2. `/ai/mapinha` — resultado de `get_mapinha_analytics` (volume, notas médias, uso de busca web) + `/ai/mapinha/interactions` paginado com pergunta/tópico/nota (sem conteúdo pessoal sensível).
3. `/certificates` — certificados emitidos por membro e por formação.
4. `/events/checkins` — check-ins de mentoria e webinar por membro/evento, incremental.
5. `/catalog` — formações, trilhas, itens e recursos (id, título, ordem, status, `is_coming_soon`), sem URLs de vídeo.
6. `/benefits` — benefícios extras e usos de cashback por membro (status, tipo, valores).
7. `/compliance` — aceite de termos e consentimento de imagem (data, versão, flag), sem PII extra.
8. `/ops/health` — resumo de `webhook_logs` (por evento/status/últimas falhas) e alertas de churn.
9. `/secondary-logins` — contas parceiras aprovadas e vínculo com a conta primária.

Regras mantidas em todas: nenhum telefone fora de `/members`/`/phones`, nenhuma URL de vídeo, nenhum ID de pagamento (Stripe/Asaas), nenhum conteúdo de mensagem privada.

## Detalhes técnicos

- Editar `supabase/functions/central-read-api/index.ts` adicionando os blocos de `resource` acima, reaproveitando `rpcResource`, `paginate`, `parseIntParam` e o filtro de equipe interna de `lib.ts`.
- Onde já existe função no banco (`get_leaderboard_with_achievements`, `get_mapinha_analytics`), chamar via RPC; verificar/garantir permissão de execução para `service_role` na mesma migração se necessário.
- As demais rotas são leituras diretas de tabela com `select` explícito de colunas seguras — sem migração de schema.
- Atualizar a documentação: novo `docs/central-read-api-extras.md` com as rotas, shapes e o prompt pronto para colar no projeto "MAP Centralizador de Dados".
- Sem alteração de front-end nesta plataforma.
