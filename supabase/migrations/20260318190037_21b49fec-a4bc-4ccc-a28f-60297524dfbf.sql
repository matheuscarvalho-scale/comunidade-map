
-- Re-add column (first migration rolled back due to index failure)
ALTER TABLE public.webhook_logs ADD COLUMN IF NOT EXISTS payment_id text;

-- Backfill
UPDATE public.webhook_logs 
SET payment_id = payload->'payment'->>'id' 
WHERE payment_id IS NULL AND payload->'payment'->>'id' IS NOT NULL;

-- Remove duplicates keeping only the earliest
DELETE FROM public.webhook_logs 
WHERE id NOT IN (
  SELECT DISTINCT ON (provider, event_type, payment_id) id
  FROM public.webhook_logs
  WHERE payment_id IS NOT NULL
  ORDER BY provider, event_type, payment_id, created_at ASC
)
AND payment_id IS NOT NULL;

-- Create unique index
CREATE UNIQUE INDEX webhook_logs_provider_event_payment_unique 
ON public.webhook_logs (provider, event_type, payment_id) 
WHERE payment_id IS NOT NULL;
