
-- Table to track plan upgrade requests and payments
CREATE TABLE public.plan_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  current_plan TEXT NOT NULL,
  new_plan TEXT NOT NULL,
  current_plan_value NUMERIC(10,2) NOT NULL,
  new_plan_value NUMERIC(10,2) NOT NULL,
  amount_already_paid NUMERIC(10,2) NOT NULL,
  upgrade_amount NUMERIC(10,2) NOT NULL,
  installments INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'payment_created', 'paid', 'failed', 'cancelled')),
  asaas_payment_id TEXT,
  invoice_url TEXT,
  external_reference TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.plan_upgrades ENABLE ROW LEVEL SECURITY;

-- Users can view their own upgrades
CREATE POLICY "Users can view own upgrades"
  ON public.plan_upgrades
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Index for webhook lookup by external_reference
CREATE INDEX idx_plan_upgrades_external_reference ON public.plan_upgrades(external_reference);
CREATE INDEX idx_plan_upgrades_user_id ON public.plan_upgrades(user_id);
CREATE INDEX idx_plan_upgrades_asaas_payment_id ON public.plan_upgrades(asaas_payment_id);
