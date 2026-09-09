-- Create enum for cashback usage status
CREATE TYPE public.cashback_status AS ENUM ('pending', 'confirmed', 'expired');

-- Create table for cashback usage tracking
CREATE TABLE public.cashback_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  partner_name TEXT NOT NULL,
  discount_percentage NUMERIC NOT NULL DEFAULT 0,
  estimated_value NUMERIC,
  usage_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status cashback_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cashback_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own cashback usage"
ON public.cashback_usage
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cashback usage"
ON public.cashback_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cashback usage"
ON public.cashback_usage
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all cashback usage for reporting
CREATE POLICY "Admins can view all cashback usage"
ON public.cashback_usage
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_cashback_usage_updated_at
BEFORE UPDATE ON public.cashback_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create index for faster queries
CREATE INDEX idx_cashback_usage_user_id ON public.cashback_usage(user_id);
CREATE INDEX idx_cashback_usage_partner_id ON public.cashback_usage(partner_id);