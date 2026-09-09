-- Fix Hudson's asaas_customer_id (was stored as JSON instead of the actual ID)
UPDATE public.payment_identifiers 
SET asaas_customer_id = 'cus_000168218921'
WHERE user_id = '0d36eb9e-948f-44f0-96b8-09b01ef90a0c';

-- Add missing payment_identifiers for Viviane
INSERT INTO public.payment_identifiers (user_id, asaas_customer_id)
VALUES ('299fe36d-b7ea-4527-a2ba-82e48b7b9301', 'cus_000168783917')
ON CONFLICT (user_id) DO UPDATE SET asaas_customer_id = EXCLUDED.asaas_customer_id;

-- Add missing payment_identifiers for Henrique
INSERT INTO public.payment_identifiers (user_id, asaas_customer_id)
VALUES ('2b472a9f-6d29-4046-a76b-96cf88ce6127', 'cus_000168772696')
ON CONFLICT (user_id) DO UPDATE SET asaas_customer_id = EXCLUDED.asaas_customer_id;