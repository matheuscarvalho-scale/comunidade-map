DELETE FROM webhook_logs WHERE customer_name = 'Teste Dedup' OR payment_id LIKE '%82d4b5c3%' OR payment_id LIKE '%pay_test_dedup%';
DELETE FROM payment_events WHERE customer_name = 'Teste Dedup';
DELETE FROM user_onboarding WHERE user_id = '82d4b5c3-9694-4e4c-aebc-16007b91048e';
DELETE FROM user_roles WHERE user_id = '82d4b5c3-9694-4e4c-aebc-16007b91048e';
DELETE FROM payment_identifiers WHERE user_id = '82d4b5c3-9694-4e4c-aebc-16007b91048e';
DELETE FROM profiles WHERE user_id = '82d4b5c3-9694-4e4c-aebc-16007b91048e';
DELETE FROM auth.users WHERE id = '82d4b5c3-9694-4e4c-aebc-16007b91048e';