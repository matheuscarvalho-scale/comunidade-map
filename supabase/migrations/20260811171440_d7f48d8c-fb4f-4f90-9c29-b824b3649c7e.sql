CREATE TABLE public.member_attribution (
  user_id UUID NOT NULL PRIMARY KEY,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  gclid TEXT,
  fbclid TEXT,
  referrer TEXT,
  landing_page TEXT,
  source_type TEXT,
  origin TEXT,
  first_touch_at TIMESTAMPTZ,
  last_touch_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.member_attribution TO authenticated;
GRANT ALL ON public.member_attribution TO service_role;

ALTER TABLE public.member_attribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own attribution"
ON public.member_attribution FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attribution"
ON public.member_attribution FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attribution"
ON public.member_attribution FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all attribution"
ON public.member_attribution FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin_geral') OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_member_attribution_updated_at ON public.member_attribution (updated_at);

CREATE TRIGGER set_member_attribution_updated_at
BEFORE UPDATE ON public.member_attribution
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();