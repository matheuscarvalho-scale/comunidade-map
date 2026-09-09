
-- Tabela de vendedores
CREATE TABLE public.vendedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  comissao_percent INTEGER NOT NULL DEFAULT 20,
  pix_chave TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de vendas
CREATE TABLE public.vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor_id UUID NOT NULL REFERENCES public.vendedores(id) ON DELETE CASCADE,
  cliente_email TEXT,
  produto TEXT,
  price_id TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  comissao_valor NUMERIC NOT NULL DEFAULT 0,
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;

-- Vendedores: admins podem tudo
CREATE POLICY "Admins can manage vendedores"
ON public.vendedores FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Vendedores: vendedores autenticados podem ver seu próprio registro (por email)
CREATE POLICY "Sellers can view own record"
ON public.vendedores FOR SELECT
TO authenticated
USING (email = (SELECT au.email FROM auth.users au WHERE au.id = auth.uid()));

-- Vendedores: leitura pública por slug (para página de venda)
CREATE POLICY "Public can read active sellers by slug"
ON public.vendedores FOR SELECT
TO anon, authenticated
USING (status = 'ativo');

-- Vendas: admins podem tudo
CREATE POLICY "Admins can manage vendas"
ON public.vendas FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Vendas: vendedores podem ver suas próprias vendas
CREATE POLICY "Sellers can view own sales"
ON public.vendas FOR SELECT
TO authenticated
USING (
  vendedor_id IN (
    SELECT v.id FROM public.vendedores v 
    WHERE v.email = (SELECT au.email FROM auth.users au WHERE au.id = auth.uid())
  )
);

-- Index for performance
CREATE INDEX idx_vendas_vendedor_id ON public.vendas(vendedor_id);
CREATE INDEX idx_vendedores_slug ON public.vendedores(slug);
CREATE INDEX idx_vendedores_email ON public.vendedores(email);
