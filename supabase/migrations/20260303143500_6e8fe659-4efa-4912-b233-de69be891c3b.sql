
-- Simulate what stripe-webhook checkout.session.completed does:
-- 1. Update profile with active subscription
UPDATE public.profiles SET
  subscription_status = 'active',
  subscription_plan = 'starter',
  stripe_customer_id = 'cus_test_luiz_simulated',
  stripe_subscription_id = 'sub_test_luiz_simulated',
  subscription_start_date = now(),
  subscription_end_date = now() + INTERVAL '365 days'
WHERE user_id = '279b8d6d-20fb-4e91-bc8a-5ac9c74da40d';
