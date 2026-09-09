-- Verificar e corrigir a política RLS da tabela user_onboarding
-- A política existente parece ser RESTRICTIVE em vez de PERMISSIVE

-- Remover a política existente se houver problema
DROP POLICY IF EXISTS "Users can view own onboarding" ON public.user_onboarding;

-- Criar política PERMISSIVE que só permite usuários verem seus próprios dados
CREATE POLICY "Users can view own onboarding" 
ON public.user_onboarding 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);