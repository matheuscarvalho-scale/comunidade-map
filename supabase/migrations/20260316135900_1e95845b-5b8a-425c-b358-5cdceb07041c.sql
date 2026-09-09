
-- Create enum for benefit types
CREATE TYPE public.extra_benefit_type AS ENUM (
  'mentoria_individual',
  'vip_extra_map_xp',
  'acesso_bonus',
  'extensao',
  'consultoria_extra',
  'outro'
);

-- Create enum for benefit status
CREATE TYPE public.extra_benefit_status AS ENUM (
  'concedido',
  'pendente',
  'em_uso',
  'entregue',
  'expirado',
  'cancelado'
);

-- Create extra_benefits table
CREATE TABLE public.extra_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  benefit_type public.extra_benefit_type NOT NULL DEFAULT 'outro',
  title text NOT NULL,
  description text,
  quantity_granted integer NOT NULL DEFAULT 1,
  quantity_used integer NOT NULL DEFAULT 0,
  status public.extra_benefit_status NOT NULL DEFAULT 'concedido',
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  source text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.extra_benefits ENABLE ROW LEVEL SECURITY;

-- Members can view their own benefits
CREATE POLICY "Members can view own extra benefits"
  ON public.extra_benefits FOR SELECT
  TO authenticated
  USING (auth.uid() = member_id);

-- CS/Admins full access
CREATE POLICY "CS and admins full access on extra_benefits"
  ON public.extra_benefits FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'cx'::app_role)
    OR has_role(auth.uid(), 'admin_geral'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'cx'::app_role)
    OR has_role(auth.uid(), 'admin_geral'::app_role)
  );

-- Service role full access
CREATE POLICY "Service role full access on extra_benefits"
  ON public.extra_benefits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Validation trigger: quantity_used <= quantity_granted
CREATE OR REPLACE FUNCTION public.validate_extra_benefit_usage()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.quantity_used > NEW.quantity_granted THEN
    RAISE EXCEPTION 'quantity_used cannot exceed quantity_granted';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_extra_benefit_usage
  BEFORE INSERT OR UPDATE ON public.extra_benefits
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_extra_benefit_usage();
