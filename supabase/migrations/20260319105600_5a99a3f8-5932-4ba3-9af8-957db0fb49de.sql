-- 1. Add audit timestamp columns
ALTER TABLE public.plan_upgrades 
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS webhook_received_at timestamptz;

-- 2. Create unique index on (user_id) for non-terminal statuses to prevent race conditions
-- This ensures only ONE pending/payment_created upgrade per user at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_upgrades_one_active_per_user 
  ON public.plan_upgrades (user_id) 
  WHERE status IN ('pending', 'payment_created');

-- 3. Create index on external_reference for fast webhook lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_upgrades_external_reference 
  ON public.plan_upgrades (external_reference) 
  WHERE external_reference IS NOT NULL;