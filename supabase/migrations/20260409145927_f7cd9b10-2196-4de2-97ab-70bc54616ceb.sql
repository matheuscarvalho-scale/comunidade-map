
CREATE TABLE public.plan_benefit_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL,
  benefit_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, benefit_key)
);

ALTER TABLE public.plan_benefit_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and CX full access on plan_benefit_checklist"
  ON public.plan_benefit_checklist
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'cx'::app_role) OR
    has_role(auth.uid(), 'admin_geral'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'cx'::app_role) OR
    has_role(auth.uid(), 'admin_geral'::app_role)
  );

CREATE POLICY "Members can view own plan benefit checklist"
  ON public.plan_benefit_checklist
  FOR SELECT
  TO authenticated
  USING (auth.uid() = member_id);
