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
    (COALESCE(pe.amount, 0) * 12)::NUMERIC as valor_plano,
    COALESCE(SUM(cu.cashback_amount) FILTER (WHERE cu.status = 'approved'), 0)::NUMERIC as cashback_gerado,
    (COALESCE(pe.amount, 0) * 12 - COALESCE(SUM(cu.cashback_amount) FILTER (WHERE cu.status = 'approved'), 0))::NUMERIC as saldo_a_pagar
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN cashback_usage cu ON cu.user_id = p.user_id
  LEFT JOIN LATERAL (
    SELECT pev.amount
    FROM payment_events pev
    WHERE pev.customer_email = u.email
      AND pev.event_type IN ('PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED')
      AND pev.amount IS NOT NULL
    ORDER BY pev.created_at DESC
    LIMIT 1
  ) pe ON true
  WHERE p.subscription_plan IN ('starter', 'pro', 'enterprise')
    AND NOT EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = p.user_id
        AND ur.role IN ('admin', 'admin_geral', 'admin_financeiro', 'admin_conteudo', 'cx', 'comercial', 'marketing')
    )
  GROUP BY p.name, u.email, p.subscription_plan, pe.amount
  ORDER BY p.name;
$$;