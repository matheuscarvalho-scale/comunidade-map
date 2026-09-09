CREATE TABLE public.image_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.mentoring_sessions(id) ON DELETE CASCADE,
  accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  consent_version text NOT NULL DEFAULT '1.0',
  UNIQUE(user_id, session_id)
);

ALTER TABLE public.image_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own consent" ON public.image_consent
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own consent" ON public.image_consent
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all consent" ON public.image_consent
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));