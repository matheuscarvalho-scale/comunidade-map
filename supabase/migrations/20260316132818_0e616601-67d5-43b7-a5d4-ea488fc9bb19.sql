
-- 1. Create payment_identifiers table
CREATE TABLE public.payment_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  asaas_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.payment_identifiers ENABLE ROW LEVEL SECURITY;

-- 3. RLS: Only the user can read their own payment identifiers
CREATE POLICY "Users can view own payment identifiers"
  ON public.payment_identifiers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. RLS: Admins can do everything
CREATE POLICY "Admins full access on payment_identifiers"
  ON public.payment_identifiers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. RLS: Service role can manage (for edge functions)
CREATE POLICY "Service role full access on payment_identifiers"
  ON public.payment_identifiers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Migrate existing data from profiles
INSERT INTO public.payment_identifiers (user_id, stripe_customer_id, stripe_subscription_id, asaas_customer_id)
SELECT user_id, stripe_customer_id, stripe_subscription_id, asaas_customer_id
FROM public.profiles
WHERE stripe_customer_id IS NOT NULL 
   OR stripe_subscription_id IS NOT NULL 
   OR asaas_customer_id IS NOT NULL;

-- 7. Drop the columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_subscription_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS asaas_customer_id;
