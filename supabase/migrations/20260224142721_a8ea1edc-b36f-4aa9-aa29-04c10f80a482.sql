
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

  -- Insert into terms_acceptance
  INSERT INTO public.terms_acceptance (user_id, terms_version, accepted_at, user_agent)
  VALUES (v_user_id, version_text, now(), user_agent_text);

  -- Update user_onboarding
  UPDATE public.user_onboarding
  SET 
    terms_accepted_at = now(),
    terms_version = version_text,
    current_step = GREATEST(current_step, 1)
  WHERE user_id = v_user_id;
END;
$$;
