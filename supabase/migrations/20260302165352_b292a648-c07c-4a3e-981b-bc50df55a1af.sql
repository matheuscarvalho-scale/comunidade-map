
-- Fix vendedores: Sellers can view own record (replace auth.users subquery)
DROP POLICY IF EXISTS "Sellers can view own record" ON public.vendedores;
CREATE POLICY "Sellers can view own record"
  ON public.vendedores FOR SELECT
  USING (email = (auth.jwt()->>'email'));

-- Fix vendas: Sellers can view own sales (replace auth.users subquery)
DROP POLICY IF EXISTS "Sellers can view own sales" ON public.vendas;
CREATE POLICY "Sellers can view own sales"
  ON public.vendas FOR SELECT
  USING (vendedor_id IN (
    SELECT v.id FROM vendedores v
    WHERE v.email = (auth.jwt()->>'email')
  ));
