UPDATE profiles
SET subscription_status = 'inactive',
    subscription_plan = NULL,
    subscription_start_date = NULL,
    subscription_end_date = NULL,
    updated_at = now()
WHERE user_id = '4fac2e7e-87aa-43e7-bebf-08b86b0e91d1'
  AND name = 'Sebrae Teste';

-- Remove a assinatura ativa caso exista em subscriptions
UPDATE subscriptions
SET status = 'cancelled',
    cancelled_at = now(),
    updated_at = now()
WHERE user_id = '4fac2e7e-87aa-43e7-bebf-08b86b0e91d1'
  AND status = 'active';