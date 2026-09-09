
-- Fix: Make the public read policy PERMISSIVE so unauthenticated users can read active sellers
-- Drop the restrictive version
DROP POLICY IF EXISTS "Public can read active sellers by slug" ON public.vendedores;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Public can read active sellers by slug"
  ON public.vendedores FOR SELECT
  USING (status = 'ativo');
