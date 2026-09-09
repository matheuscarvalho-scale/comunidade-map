
-- Table: payment_events (auditoria de pagamentos Asaas)
CREATE TABLE public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payment_id TEXT,
  customer_email TEXT,
  customer_name TEXT,
  amount NUMERIC,
  plan TEXT,
  status TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage payment_events"
  ON public.payment_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Table: pending_payments (pagamentos sem usuário correspondente)
CREATE TABLE public.pending_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  amount NUMERIC,
  plan TEXT,
  asaas_payment_id TEXT,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pending_payments"
  ON public.pending_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Table: conta_azul_tokens (OAuth tokens for Conta Azul)
CREATE TABLE public.conta_azul_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conta_azul_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage conta_azul_tokens"
  ON public.conta_azul_tokens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add asaas_customer_id to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
