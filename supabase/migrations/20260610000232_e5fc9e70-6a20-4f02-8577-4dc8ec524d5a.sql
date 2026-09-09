
CREATE TABLE public.conta_azul_customer_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  document text,
  asaas_customer_id text,
  conta_azul_customer_id text NOT NULL,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX conta_azul_customer_mapping_email_uidx
  ON public.conta_azul_customer_mapping (lower(email));
CREATE UNIQUE INDEX conta_azul_customer_mapping_document_uidx
  ON public.conta_azul_customer_mapping (document) WHERE document IS NOT NULL;
CREATE UNIQUE INDEX conta_azul_customer_mapping_asaas_uidx
  ON public.conta_azul_customer_mapping (asaas_customer_id) WHERE asaas_customer_id IS NOT NULL;
CREATE INDEX conta_azul_customer_mapping_ca_id_idx
  ON public.conta_azul_customer_mapping (conta_azul_customer_id);

GRANT ALL ON public.conta_azul_customer_mapping TO service_role;
GRANT SELECT ON public.conta_azul_customer_mapping TO authenticated;

ALTER TABLE public.conta_azul_customer_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view conta azul mapping"
  ON public.conta_azul_customer_mapping
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'admin_financeiro'::app_role)
  );

CREATE TRIGGER trg_conta_azul_customer_mapping_updated_at
  BEFORE UPDATE ON public.conta_azul_customer_mapping
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
