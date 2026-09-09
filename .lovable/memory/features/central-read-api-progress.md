---
name: Central Read API Progress
description: Rotas /progress e /progress/lessons da central-read-api (CS 360) e campos extras de /engagement
type: feature
---

`/engagement` já expõe por membro: `first_access_at`, `page_views`, `clicks`,
`avg_session_seconds`, `total_seconds`, além de `sessions`, `total_minutes`,
`last_access_at`, `lessons_completed`, `mentoring_checkins`, `webinar_checkins`,
`updated_at`.

`GET /progress` — agregado membro × trilha: `track_id`, `track_title`, `track_type`
(`formacao` | `trilha` | `mentoria_gravada` (slug `mentorias`) | `webinar_gravado`
(slug `webinars`)), `lessons_total`, `lessons_completed`, `progress_percent`,
`started_at`, `last_activity_at`, `completed_at` (só quando 100%), `updated_at`.
Filtros: `user_id`, `page`, `per_page`, `updated_since`, `include_internal`.

`GET /progress/lessons` — detalhe aula a aula; `watch_seconds` é sempre `null`
(tracking de vídeo foi removido da plataforma).

Fontes: formations → formation_modules → formation_lessons + formation_lesson_progress,
content_tracks → content_items + content_item_progress. As tabelas de progresso passam
de 1000 linhas, então a função pagina internamente com `.range()`.
Doc: `docs/central-read-api-analytics.md`.
