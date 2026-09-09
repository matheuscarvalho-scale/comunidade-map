
ALTER TABLE public.user_onboarding
  ADD COLUMN IF NOT EXISTS sales_channels text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ecommerce_platform text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS uses_erp boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS erp_tools text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS erp_other text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS uses_ai boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_tools text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS uses_accounting boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS accounting_service text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_supplier_difficulty boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS supplier_needs text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS business_niche text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS business_niche_other text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS employee_range text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS average_ticket text DEFAULT NULL;
