-- Corrige loop de aceite de termos: a versão anterior fazia apenas UPDATE em
-- user_onboarding, então membros SEM linha nessa tabela nunca tinham a versão
-- aceita gravada (o UPDATE atingia 0 linhas) e os termos reapareciam a cada login.
-- Agora é um UPSERT: cria a linha se não existir, ou atualiza se existir.
CREATE OR REPLACE FUNCTION public.accept_terms(
  version_text text,
  user_agent_text text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Log de auditoria (uma linha por aceite)
  INSERT INTO public.terms_acceptance (user_id, terms_version, accepted_at, user_agent)
  VALUES (v_user_id, version_text, now(), user_agent_text);

  -- UPSERT: garante que a versão aceita seja sempre persistida, mesmo que a
  -- linha de onboarding ainda não exista para este usuário.
  -- Se a linha NÃO existe (conta antiga/interna que nunca passou pelo onboarding
  -- normal), já marcamos completed_at para não jogá-la no wizard em loop.
  -- Membros novos têm a linha criada pelo fluxo normal ANTES do aceite, então
  -- caem no ramo UPDATE e continuam vendo o wizard normalmente.
  INSERT INTO public.user_onboarding (user_id, terms_accepted_at, terms_version, current_step, completed_at)
  VALUES (v_user_id, now(), version_text, 12, now())
  ON CONFLICT (user_id) DO UPDATE
    SET terms_accepted_at = now(),
        terms_version = version_text,
        current_step = GREATEST(public.user_onboarding.current_step, 1);
END;
$$;

-- Backfill: usuários que já registraram aceite (terms_acceptance) mas ficaram sem
-- linha em user_onboarding — exatamente os presos no loop de reaceite. Cria a linha
-- com a última versão que aceitaram e marca como concluída, resolvendo na hora.
INSERT INTO public.user_onboarding (user_id, terms_accepted_at, terms_version, current_step, completed_at)
SELECT DISTINCT ON (ta.user_id)
  ta.user_id, ta.accepted_at, ta.terms_version, 12, now()
FROM public.terms_acceptance ta
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_onboarding uo WHERE uo.user_id = ta.user_id
)
ORDER BY ta.user_id, ta.accepted_at DESC
ON CONFLICT (user_id) DO NOTHING;
