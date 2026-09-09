CREATE OR REPLACE FUNCTION public.get_cashback_saldo_planos()
 RETURNS TABLE(cliente text, email text, plano text, valor_plano numeric, cashback_gerado numeric, saldo_a_pagar numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.name as cliente,
    u.email::text,
    p.subscription_plan as plano,
    CASE 
      WHEN p.user_id = 'a70d7c42-bb8a-4824-a9f0-0b6f78bada9a'::uuid THEN 4764
      WHEN p.subscription_plan IN ('basic', 'starter') THEN 2364
      WHEN p.subscription_plan = 'pro' THEN 4764
      WHEN p.subscription_plan IN ('business', 'enterprise') THEN 11964
      ELSE 0
    END::NUMERIC as valor_plano,
    COALESCE(SUM(cu.cashback_amount) FILTER (WHERE cu.status = 'approved'), 0)::NUMERIC as cashback_gerado,
    (CASE 
      WHEN p.user_id = 'a70d7c42-bb8a-4824-a9f0-0b6f78bada9a'::uuid THEN 4764
      WHEN p.subscription_plan IN ('basic', 'starter') THEN 2364
      WHEN p.subscription_plan = 'pro' THEN 4764
      WHEN p.subscription_plan IN ('business', 'enterprise') THEN 11964
      ELSE 0
    END - COALESCE(SUM(cu.cashback_amount) FILTER (WHERE cu.status = 'approved'), 0))::NUMERIC as saldo_a_pagar
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN cashback_usage cu ON cu.user_id = p.user_id
  WHERE p.subscription_plan IN ('basic', 'starter', 'pro', 'business', 'enterprise')
    AND p.subscription_status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = p.user_id
        AND ur.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing')
    )
    AND p.user_id NOT IN (
      '69add853-127c-411d-8f68-2051f278e84c'::uuid,
      '430cdde2-f2e4-49c8-8c96-f0c649519f00'::uuid
    )
  GROUP BY p.name, u.email, p.subscription_plan, p.user_id
  ORDER BY p.name;
$function$;