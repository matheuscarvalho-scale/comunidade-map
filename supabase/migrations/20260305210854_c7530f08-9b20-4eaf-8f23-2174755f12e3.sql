-- FIX #1: Remove public read policy on vendedores - replace with authenticated-only
DROP POLICY IF EXISTS "Public can read active sellers by slug" ON public.vendedores;

-- Only authenticated users can read active sellers
CREATE POLICY "Authenticated can read active sellers by slug"
  ON public.vendedores FOR SELECT
  TO authenticated
  USING (status = 'ativo');

-- Also restrict vendas SELECT to authenticated role
DROP POLICY IF EXISTS "Sellers can view own sales" ON public.vendas;
CREATE POLICY "Sellers can view own sales"
  ON public.vendas FOR SELECT
  TO authenticated
  USING (vendedor_id IN (
    SELECT v.id FROM vendedores v
    WHERE v.email = (auth.jwt() ->> 'email'::text)
  ));