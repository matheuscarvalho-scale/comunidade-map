
CREATE OR REPLACE FUNCTION public.get_cashback_dashboard_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_registros', COUNT(*),
    'confirmadas', COUNT(*) FILTER (WHERE status = 'confirmado'),
    'nao_converteu', COUNT(*) FILTER (WHERE status = 'nao_converteu'),
    'aguardando', COUNT(*) FILTER (WHERE status IS NULL OR status = 'aguardando' OR status = 'clicked'),
    'total_vendas', COALESCE(SUM(purchase_value) FILTER (WHERE status = 'confirmado'), 0),
    'total_cashback', COALESCE(SUM(cashback_value) FILTER (WHERE status = 'confirmado'), 0),
    'taxa_conversao', CASE WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE status = 'confirmado')::numeric / COUNT(*)::numeric) * 100, 1)
      ELSE 0 END
  )
  FROM partner_clicks;
$$;

CREATE OR REPLACE FUNCTION public.get_cashback_partner_performance()
RETURNS TABLE(
  partner_name TEXT,
  cliques BIGINT,
  confirmadas BIGINT,
  taxa_conversao NUMERIC,
  vendas NUMERIC,
  cashback NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pc.partner_name,
    COUNT(*)::BIGINT as cliques,
    COUNT(*) FILTER (WHERE pc.status = 'confirmado')::BIGINT as confirmadas,
    CASE WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE pc.status = 'confirmado')::numeric / COUNT(*)::numeric) * 100, 1)
      ELSE 0 END as taxa_conversao,
    COALESCE(SUM(pc.purchase_value) FILTER (WHERE pc.status = 'confirmado'), 0)::NUMERIC as vendas,
    COALESCE(SUM(pc.cashback_value) FILTER (WHERE pc.status = 'confirmado'), 0)::NUMERIC as cashback
  FROM partner_clicks pc
  GROUP BY pc.partner_name
  ORDER BY cliques DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_cashback_saldo_planos()
RETURNS TABLE(
  cliente TEXT,
  email TEXT,
  plano TEXT,
  valor_plano NUMERIC,
  cashback_gerado NUMERIC,
  saldo_a_pagar NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.name as cliente,
    u.email,
    p.subscription_plan as plano,
    CASE 
      WHEN p.subscription_plan = 'starter' THEN 297
      WHEN p.subscription_plan = 'pro' THEN 497
      WHEN p.subscription_plan = 'enterprise' THEN 597
      ELSE 0
    END::NUMERIC as valor_plano,
    COALESCE(SUM(cu.cashback_amount) FILTER (WHERE cu.status = 'approved'), 0)::NUMERIC as cashback_gerado,
    (CASE 
      WHEN p.subscription_plan = 'starter' THEN 297
      WHEN p.subscription_plan = 'pro' THEN 497
      WHEN p.subscription_plan = 'enterprise' THEN 597
      ELSE 0
    END - COALESCE(SUM(cu.cashback_amount) FILTER (WHERE cu.status = 'approved'), 0))::NUMERIC as saldo_a_pagar
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN cashback_usage cu ON cu.user_id = p.user_id
  WHERE p.subscription_plan IN ('starter', 'pro', 'enterprise')
  GROUP BY p.name, u.email, p.subscription_plan
  ORDER BY p.name;
$$;
