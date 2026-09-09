ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancel_reason_detail text,
  ADD COLUMN IF NOT EXISTS cancel_source text;

CREATE OR REPLACE FUNCTION public.validate_subscription_cancel_reason()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.cancel_reason IS NOT NULL AND NEW.cancel_reason NOT IN (
    'payment_deleted',
    'payment_overdue',
    'refund_requested',
    'refund_after_window',
    'chargeback',
    'plan_downgrade',
    'customer_request',
    'duplicate_account',
    'account_deleted',
    'other'
  ) THEN
    RAISE EXCEPTION 'cancel_reason inválido: %', NEW.cancel_reason;
  END IF;

  IF NEW.cancel_source IS NOT NULL AND NEW.cancel_source NOT IN (
    'asaas_webhook',
    'stripe_webhook',
    'admin',
    'member',
    'system'
  ) THEN
    RAISE EXCEPTION 'cancel_source inválido: %', NEW.cancel_source;
  END IF;

  IF NEW.cancel_reason = 'other'
     AND (NEW.cancel_reason_detail IS NULL OR btrim(NEW.cancel_reason_detail) = '') THEN
    RAISE EXCEPTION 'cancel_reason_detail é obrigatório quando cancel_reason = other';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_subscription_cancel_reason ON public.subscriptions;
CREATE TRIGGER validate_subscription_cancel_reason
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_cancel_reason();