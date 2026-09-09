UPDATE profiles 
SET subscription_plan = 'enterprise', 
    subscription_status = 'active',
    subscription_start_date = now(),
    subscription_end_date = now() + interval '1 year'
WHERE user_id = '430cdde2-f2e4-49c8-8c96-f0c649519f00';