-- Add new columns to cashback_usage table for complete tracking
ALTER TABLE public.cashback_usage
ADD COLUMN IF NOT EXISTS purchase_amount numeric,
ADD COLUMN IF NOT EXISTS cashback_amount numeric,
ADD COLUMN IF NOT EXISTS proof_url text,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Update the cashback_status enum to include new statuses
-- First, we need to add the new values to the enum
ALTER TYPE public.cashback_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.cashback_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE public.cashback_status ADD VALUE IF NOT EXISTS 'rejected';

-- Create index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_cashback_usage_status ON public.cashback_usage(status);
CREATE INDEX IF NOT EXISTS idx_cashback_usage_partner ON public.cashback_usage(partner_id);

-- Update RLS policy to allow admins to update any cashback record
DROP POLICY IF EXISTS "Admins can update all cashback usage" ON public.cashback_usage;
CREATE POLICY "Admins can update all cashback usage"
ON public.cashback_usage
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for cashback proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('cashback-proofs', 'cashback-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for cashback proofs
CREATE POLICY "Users can upload own cashback proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'cashback-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own cashback proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'cashback-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all cashback proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'cashback-proofs' 
  AND has_role(auth.uid(), 'admin'::app_role)
);