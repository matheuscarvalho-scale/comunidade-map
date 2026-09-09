
-- Create terms_acceptance table
CREATE TABLE public.terms_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version text NOT NULL DEFAULT '2.0',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Enable RLS
ALTER TABLE public.terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptance records
CREATE POLICY "Users can view own terms acceptance"
ON public.terms_acceptance
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own acceptance records
CREATE POLICY "Users can insert own terms acceptance"
ON public.terms_acceptance
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all acceptance records
CREATE POLICY "Admins can view all terms acceptance"
ON public.terms_acceptance
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_terms_acceptance_user_version ON public.terms_acceptance(user_id, terms_version);
