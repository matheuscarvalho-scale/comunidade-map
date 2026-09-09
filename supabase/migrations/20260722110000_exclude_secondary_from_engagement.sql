-- Exclui usuários secundários (logins secundários de uma conta principal) e contas
-- internas por domínio de e-mail (@mapeducacao.com) das métricas de engajamento e da
-- lista de inativos, além das contas internas/admin que já eram excluídas.
-- Mantém o restante das funções inalterado.

CREATE OR REPLACE FUNCTION public.get_engagement_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_members INTEGER;
  active_7d INTEGER;
  inactive_30d INTEGER;
  avg_session_seconds NUMERIC;
  result jsonb;
  internal_ids uuid[] := ARRAY[
    '69add853-127c-411d-8f68-2051f278e84c'::uuid,
    '430cdde2-f2e4-49c8-8c96-f0c649519f00'::uuid,
    '1894fbbc-eb90-45f3-9abb-c67065393c31'::uuid,
    'e4e8f871-cedd-47ab-9e14-3c52eed7d40e'::uuid,
    '9747c48e-ab50-4d33-82f6-36e8a4d94398'::uuid,
    '297e25c2-fb4e-47ad-a8da-bdf0b4c70ebf'::uuid,
    '634f99e0-131b-481c-816d-c14301568fe7'::uuid,
    'b7783f1f-5e44-46ad-b1f9-17fe451d0689'::uuid
  ];
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role) OR public.has_permission(auth.uid(),'analytics.manage')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COUNT(*) INTO total_members
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.subscription_status = 'active'
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('basic', 'starter', 'pro', 'enterprise', 'business'))
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = p.user_id
        AND ur2.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing', 'automacao')
    )
    AND p.user_id <> ALL(internal_ids)
    AND NOT EXISTS (SELECT 1 FROM public.secondary_logins sl WHERE sl.secondary_user_id = p.user_id)
    AND au.email NOT ILIKE '%@mapeducacao.com';

  SELECT COUNT(DISTINCT p.user_id) INTO active_7d
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.subscription_status = 'active'
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('basic', 'starter', 'pro', 'enterprise', 'business'))
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = p.user_id
        AND ur2.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing', 'automacao')
    )
    AND p.user_id <> ALL(internal_ids)
    AND NOT EXISTS (SELECT 1 FROM public.secondary_logins sl WHERE sl.secondary_user_id = p.user_id)
    AND au.email NOT ILIKE '%@mapeducacao.com'
    AND (
      EXISTS (SELECT 1 FROM public.member_analytics ma WHERE ma.user_id = p.user_id AND ma.created_at >= now() - INTERVAL '7 days')
      OR p.updated_at >= now() - INTERVAL '7 days'
    );

  SELECT COUNT(*) INTO inactive_30d
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.subscription_status = 'active'
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('basic', 'starter', 'pro', 'enterprise', 'business'))
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = p.user_id
        AND ur2.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing', 'automacao')
    )
    AND p.user_id <> ALL(internal_ids)
    AND NOT EXISTS (SELECT 1 FROM public.secondary_logins sl WHERE sl.secondary_user_id = p.user_id)
    AND au.email NOT ILIKE '%@mapeducacao.com'
    AND NOT EXISTS (
      SELECT 1 FROM public.member_analytics ma
      WHERE ma.user_id = p.user_id AND ma.created_at >= now() - INTERVAL '30 days'
    );

  SELECT COALESCE(AVG(LEAST(duration_seconds, 1800)), 0)::numeric(10,2) INTO avg_session_seconds
  FROM public.member_analytics ma
  JOIN auth.users au ON au.id = ma.user_id
  WHERE ma.event_type = 'page_duration'
    AND ma.duration_seconds IS NOT NULL
    AND ma.duration_seconds > 0
    AND ma.created_at >= now() - INTERVAL '30 days'
    AND ma.user_id <> ALL(internal_ids)
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = ma.user_id
        AND ur.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing', 'automacao')
    )
    AND NOT EXISTS (SELECT 1 FROM public.secondary_logins sl WHERE sl.secondary_user_id = ma.user_id)
    AND au.email NOT ILIKE '%@mapeducacao.com'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = ma.user_id AND p.subscription_status = 'active'
    );

  result := jsonb_build_object(
    'total_members', total_members,
    'active_7d', active_7d,
    'inactive_30d', inactive_30d,
    'avg_session_seconds', avg_session_seconds
  );

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_inactive_members(inactive_days integer DEFAULT 20, limit_count integer DEFAULT 50)
RETURNS TABLE(user_id uuid, name text, email text, avatar_url text, last_activity timestamp with time zone, days_inactive integer, subscription_plan text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  internal_ids uuid[] := ARRAY[
    '69add853-127c-411d-8f68-2051f278e84c'::uuid,
    '430cdde2-f2e4-49c8-8c96-f0c649519f00'::uuid,
    '1894fbbc-eb90-45f3-9abb-c67065393c31'::uuid,
    'e4e8f871-cedd-47ab-9e14-3c52eed7d40e'::uuid,
    '9747c48e-ab50-4d33-82f6-36e8a4d94398'::uuid,
    '297e25c2-fb4e-47ad-a8da-bdf0b4c70ebf'::uuid,
    '634f99e0-131b-481c-816d-c14301568fe7'::uuid,
    'b7783f1f-5e44-46ad-b1f9-17fe451d0689'::uuid
  ];
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role) OR public.has_role(auth.uid(),'admin_financeiro'::app_role) OR public.has_permission(auth.uid(),'analytics.manage')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT
    p.user_id,
    p.name,
    au.email::TEXT,
    p.avatar_url,
    COALESCE(latest.last_seen, p.updated_at) AS last_activity,
    EXTRACT(DAY FROM now() - COALESCE(latest.last_seen, p.updated_at))::INTEGER AS days_inactive,
    p.subscription_plan
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN LATERAL (
    SELECT MAX(ma.created_at) AS last_seen
    FROM public.member_analytics ma
    WHERE ma.user_id = p.user_id
  ) latest ON true
  WHERE p.subscription_status = 'active'
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role IN ('basic', 'starter', 'pro', 'enterprise', 'business'))
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = p.user_id
        AND ur2.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing', 'automacao')
    )
    AND p.user_id <> ALL(internal_ids)
    AND NOT EXISTS (SELECT 1 FROM public.secondary_logins sl WHERE sl.secondary_user_id = p.user_id)
    AND au.email NOT ILIKE '%@mapeducacao.com'
    AND COALESCE(latest.last_seen, p.updated_at) < now() - (inactive_days || ' days')::INTERVAL
  ORDER BY COALESCE(latest.last_seen, p.updated_at) ASC NULLS FIRST
  LIMIT limit_count;
END;
$function$;
