CREATE TABLE public.member_deletions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT,
  name TEXT,
  reason TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX member_deletions_user_id_key ON public.member_deletions (user_id);
CREATE INDEX member_deletions_deleted_at_idx ON public.member_deletions (deleted_at DESC);

GRANT ALL ON public.member_deletions TO service_role;

ALTER TABLE public.member_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view member deletions"
ON public.member_deletions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_geral') OR public.has_role(auth.uid(), 'admin'));