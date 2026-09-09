CREATE OR REPLACE FUNCTION public.get_mapinha_analytics(days_back integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  result jsonb;
  start_at timestamptz;
BEGIN
  IF NOT (
    auth.role() = 'service_role'
    OR current_user IN ('postgres','supabase_admin','supabase_read_only_user')
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'admin_geral'::app_role)
    OR public.has_permission(auth.uid(), 'analytics.manage')
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  days_back := LEAST(GREATEST(COALESCE(days_back, 30), 1), 365);
  start_at := now() - make_interval(days => days_back);

  WITH filtered AS MATERIALIZED (
    SELECT *
    FROM public.mapinha_interactions
    WHERE created_at >= start_at
  ),
  summary AS (
    SELECT jsonb_build_object(
      'total_questions', count(*),
      'unique_users', count(DISTINCT user_id),
      'conversations', count(DISTINCT conversation_id),
      'answered', count(*) FILTER (WHERE status = 'answered'),
      'errors', count(*) FILTER (WHERE status = 'error'),
      'success_rate', COALESCE(round(100.0 * count(*) FILTER (WHERE status = 'answered') / NULLIF(count(*), 0), 1), 0),
      'avg_latency_ms', COALESCE(round(avg(latency_ms) FILTER (WHERE status = 'answered')), 0),
      'web_search_rate', COALESCE(round(100.0 * count(*) FILTER (WHERE web_search_count > 0) / NULLIF(count(*), 0), 1), 0),
      'positive_ratings', count(*) FILTER (WHERE rating = 1),
      'negative_ratings', count(*) FILTER (WHERE rating = -1),
      'rating_rate', COALESCE(round(100.0 * count(*) FILTER (WHERE rating IS NOT NULL) / NULLIF(count(*) FILTER (WHERE status = 'answered'), 0), 1), 0)
    ) AS value
    FROM filtered
  ),
  daily AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(d) ORDER BY d.day), '[]'::jsonb) value
    FROM (
      SELECT created_at::date AS day, count(*) AS questions,
        count(DISTINCT user_id) AS users,
        count(*) FILTER (WHERE status = 'error') AS errors
      FROM filtered GROUP BY created_at::date
    ) d
  ),
  topics AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.questions DESC), '[]'::jsonb) value
    FROM (
      SELECT topic, count(*) AS questions, count(DISTINCT user_id) AS users,
        COALESCE(round(avg(latency_ms) FILTER (WHERE status = 'answered')), 0) AS avg_latency_ms,
        count(*) FILTER (WHERE rating = 1) AS positive,
        count(*) FILTER (WHERE rating = -1) AS negative
      FROM filtered GROUP BY topic LIMIT 20
    ) t
  ),
  top_users AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(u) ORDER BY u.questions DESC), '[]'::jsonb) value
    FROM (
      SELECT f.user_id, COALESCE(p.name, split_part(au.email, '@', 1), 'Membro') AS name,
        au.email, p.avatar_url, p.company, p.subscription_plan,
        count(*) AS questions, count(DISTINCT f.conversation_id) AS conversations,
        max(f.created_at) AS last_question_at
      FROM filtered f
      LEFT JOIN public.profiles p ON p.user_id = f.user_id
      LEFT JOIN auth.users au ON au.id = f.user_id
      GROUP BY f.user_id, p.name, au.email, p.avatar_url, p.company, p.subscription_plan
      ORDER BY count(*) DESC
      LIMIT 20
    ) u
  ),
  repeated_questions AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q.occurrences DESC), '[]'::jsonb) value
    FROM (
      SELECT min(question) AS question, topic, count(*) AS occurrences,
        count(DISTINCT user_id) AS users, max(created_at) AS last_asked_at
      FROM filtered
      GROUP BY lower(regexp_replace(trim(question), '\s+', ' ', 'g')), topic
      ORDER BY count(*) DESC, max(created_at) DESC
      LIMIT 20
    ) q
  ),
  recent AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC), '[]'::jsonb) value
    FROM (
      SELECT f.id, f.question, f.answer, f.topic, f.status, f.error_message,
        f.latency_ms, f.web_search_count, f.search_queries, f.rating,
        f.created_at, f.conversation_id,
        COALESCE(p.name, split_part(au.email, '@', 1), 'Membro') AS user_name,
        au.email AS user_email, p.avatar_url
      FROM filtered f
      LEFT JOIN public.profiles p ON p.user_id = f.user_id
      LEFT JOIN auth.users au ON au.id = f.user_id
      ORDER BY f.created_at DESC
      LIMIT 100
    ) r
  ),
  hours AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.hour), '[]'::jsonb) value
    FROM (
      SELECT extract(hour FROM created_at AT TIME ZONE 'America/Sao_Paulo')::int AS hour,
        count(*) AS questions
      FROM filtered GROUP BY 1
    ) h
  )
  SELECT jsonb_build_object(
    'period_days', days_back,
    'summary', summary.value,
    'daily', daily.value,
    'topics', topics.value,
    'top_users', top_users.value,
    'repeated_questions', repeated_questions.value,
    'recent', recent.value,
    'hours', hours.value
  )
  INTO result
  FROM summary, daily, topics, top_users, repeated_questions, recent, hours;

  RETURN result;
END;
$function$;