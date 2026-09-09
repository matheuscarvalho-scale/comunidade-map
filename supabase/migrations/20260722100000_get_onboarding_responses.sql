
-- RPC para o dashboard de Onboarding no Analytics de Engajamento.
-- Retorna as respostas do onboarding invisível dos membros, juntando
-- nome/e-mail/plano do perfil. Exclui: contas com papéis internos/admin,
-- a lista fixa de contas internas (equipe/testes) e usuários secundários.
CREATE OR REPLACE FUNCTION public.get_onboarding_responses()
RETURNS TABLE(
  user_id uuid,
  name text,
  email text,
  avatar_url text,
  subscription_plan text,
  completed_at timestamp with time zone,
  current_step integer,
  created_at timestamp with time zone,
  city_state text,
  experience_level text,
  business_models text[],
  main_goal text,
  weekly_hours text,
  revenue_goal text,
  sales_channels text[],
  business_niche text,
  business_niche_other text,
  employee_range text,
  average_ticket text,
  company text,
  job_title text,
  uses_erp boolean,
  erp_tools text[],
  erp_other text,
  uses_ai boolean,
  ai_tools text,
  uses_accounting boolean,
  accounting_service text,
  has_supplier_difficulty boolean,
  supplier_needs text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'admin_geral'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT
    uo.user_id,
    COALESCE(p.name, uo.full_name) AS name,
    au.email::text,
    p.avatar_url,
    p.subscription_plan,
    uo.completed_at,
    uo.current_step,
    uo.created_at,
    uo.city_state,
    uo.experience_level,
    uo.business_models,
    uo.main_goal,
    uo.weekly_hours,
    uo.revenue_goal,
    uo.sales_channels,
    uo.business_niche,
    uo.business_niche_other,
    uo.employee_range,
    uo.average_ticket,
    uo.company,
    uo.job_title,
    uo.uses_erp,
    uo.erp_tools,
    uo.erp_other,
    uo.uses_ai,
    uo.ai_tools,
    uo.uses_accounting,
    uo.accounting_service,
    uo.has_supplier_difficulty,
    uo.supplier_needs
  FROM public.user_onboarding uo
  LEFT JOIN public.profiles p ON p.user_id = uo.user_id
  LEFT JOIN auth.users au ON au.id = uo.user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = uo.user_id
      AND ur.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing', 'automacao')
  )
  -- Exclui a lista fixa de contas internas (equipe/testes)
  AND uo.user_id <> ALL(internal_ids)
  -- Exclui usuários secundários (logins secundários de uma conta principal)
  AND NOT EXISTS (
    SELECT 1 FROM public.secondary_logins sl
    WHERE sl.secondary_user_id = uo.user_id
  )
  -- Exclui contas internas pelo domínio de e-mail da empresa (@mapeducacao.com)
  AND COALESCE(au.email::text, '') NOT ILIKE '%@mapeducacao.com'
  ORDER BY uo.created_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_onboarding_responses() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_onboarding_responses() TO authenticated, service_role;
