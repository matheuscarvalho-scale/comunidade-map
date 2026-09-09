
-- 1) Private internal tokens table (NO grants to anon/authenticated; only service_role + SECURITY DEFINER funcs)
CREATE TABLE IF NOT EXISTS public.internal_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.internal_tokens FROM anon, authenticated;
GRANT ALL ON public.internal_tokens TO service_role;

ALTER TABLE public.internal_tokens ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated => no access. Service role bypasses RLS.

-- Seed the token used by Make notify functions
INSERT INTO public.internal_tokens(name) VALUES ('make_notify')
ON CONFLICT (name) DO NOTHING;

-- 2) Verifier function (callable by anyone but only returns boolean)
CREATE OR REPLACE FUNCTION public.verify_internal_token(_name text, _token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.internal_tokens
    WHERE name = _name AND token = _token
  );
$$;

REVOKE ALL ON FUNCTION public.verify_internal_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_internal_token(text, text) TO anon, authenticated, service_role;

-- 3) Internal-only getter (only callable from SECURITY DEFINER db code)
CREATE OR REPLACE FUNCTION public._get_internal_token(_name text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT token FROM public.internal_tokens WHERE name = _name;
$$;

REVOKE ALL ON FUNCTION public._get_internal_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._get_internal_token(text) TO service_role;

-- 4) Update notify_new_content_webhook (4-arg) to send x-internal-token header
CREATE OR REPLACE FUNCTION public.notify_new_content_webhook(_tipo text, _titulo text, _presenter text DEFAULT NULL, _link text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _url text := 'https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/notify-make-new-content';
  _body jsonb;
  _token text;
BEGIN
  IF _titulo IS NULL OR length(trim(_titulo)) = 0 THEN
    RETURN;
  END IF;

  SELECT token INTO _token FROM public.internal_tokens WHERE name = 'make_notify';

  _body := jsonb_build_object('tipo', _tipo, 'titulo', _titulo, 'source', _tipo);
  IF _presenter IS NOT NULL AND length(trim(_presenter)) > 0 THEN
    _body := _body || jsonb_build_object('presenter', _presenter);
  END IF;
  IF _link IS NOT NULL AND length(trim(_link)) > 0 THEN
    _body := _body || jsonb_build_object('link', _link);
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-token', COALESCE(_token, '')),
    body := _body
  );
END;
$function$;

-- Also update 2-arg version (legacy) to send token, just in case
CREATE OR REPLACE FUNCTION public.notify_new_content_webhook(_tipo text, _titulo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _url text := 'https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/notify-make-new-content';
  _token text;
BEGIN
  IF _titulo IS NULL OR length(trim(_titulo)) = 0 THEN
    RETURN;
  END IF;

  SELECT token INTO _token FROM public.internal_tokens WHERE name = 'make_notify';

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-token', COALESCE(_token, '')),
    body := jsonb_build_object('tipo', _tipo, 'titulo', _titulo, 'source', _tipo)
  );
END;
$function$;

-- 5) Recreate cron jobs with x-internal-token header (built dynamically using token value)
DO $$
DECLARE
  _tok text;
  _hdr text;
BEGIN
  SELECT token INTO _tok FROM public.internal_tokens WHERE name = 'make_notify';
  _hdr := format('{"Content-Type":"application/json","x-internal-token":"%s"}', _tok);

  PERFORM cron.unschedule('notify-make-daily-event-8am-brt');
  PERFORM cron.unschedule('notify-make-monday-8h-brt');
  PERFORM cron.unschedule('notify-make-thursday-18h-brt');
  PERFORM cron.unschedule('notify-make-wednesday-19h-brt');

  PERFORM cron.schedule(
    'notify-make-daily-event-8am-brt',
    '0 11 * * 4',
    format($job$SELECT net.http_post(
      url := 'https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/notify-make-daily-event?source=quinta_8h',
      headers := %L::jsonb,
      body := jsonb_build_object('triggered_at', now())
    ) AS request_id;$job$, _hdr)
  );

  PERFORM cron.schedule(
    'notify-make-monday-8h-brt',
    '0 11 * * 1',
    format($job$SELECT net.http_post(
      url := 'https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/notify-make-daily-event?days_ahead=3&source=segunda_8h',
      headers := %L::jsonb,
      body := jsonb_build_object('triggered_at', now())
    ) AS request_id;$job$, _hdr)
  );

  PERFORM cron.schedule(
    'notify-make-thursday-18h-brt',
    '0 21 * * 4',
    format($job$SELECT net.http_post(
      url := 'https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/notify-make-daily-event?source=quinta_18h',
      headers := %L::jsonb,
      body := jsonb_build_object('triggered_at', now())
    ) AS request_id;$job$, _hdr)
  );

  PERFORM cron.schedule(
    'notify-make-wednesday-19h-brt',
    '0 22 * * 3',
    format($job$SELECT net.http_post(
      url := 'https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/notify-make-daily-event?days_ahead=1&source=quarta_19h',
      headers := %L::jsonb,
      body := jsonb_build_object('triggered_at', now())
    ) AS request_id;$job$, _hdr)
  );
END
$$;
