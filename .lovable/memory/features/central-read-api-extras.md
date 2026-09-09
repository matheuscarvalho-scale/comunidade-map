---
name: Central Read API Extras
description: Rotas complementares da central-read-api (gamificação, Mapinha, certificados, check-ins, catálogo, benefícios, compliance, ops)
type: feature
---

Além de `/members`, `/onboarding`, `/subscriptions`, `/phones`, `/deletions`, `/analytics/*` e
`/marketing/*`, a `central-read-api` expõe:

- `/gamification/leaderboard`, `/gamification/achievements`, `/gamification/user-achievements`
- `/ai/mapinha` (usa `get_mapinha_analytics`, cujo guard agora aceita `service_role`) e `/ai/mapinha/interactions`
- `/certificates`, `/events/checkins?kind=webinar|mentoring`, `/catalog`
- `/benefits/extra`, `/benefits/cashback`, `/plan-upgrades`
- `/compliance/terms`, `/compliance/image-consent`, `/secondary-logins`, `/networking/connections`
- `/ops/health` (webhook_logs agregado + falhas recentes + churn_alert_logs)

Regras: exclusão de equipe interna combina `INTERNAL_USER_IDS` + roles de staff em `user_roles`;
nunca expõem telefone (só `/members` e `/phones`), URL de vídeo, IDs de pagamento nem conteúdo de
mensagens privadas. Embed de `webinar_checkins` exige o hint `webinars!fk_webinar_checkins_webinar`
porque a tabela tem duas FKs para `webinars`.

Documentação: `docs/central-read-api-extras.md` (inclui o prompt para o Centralizador).
