-- Repoint trigger functions that hardcoded the old (Lovable) project's edge function URLs
-- to the new project (tcncngawqeudwjxgcvia), now that the DB has been migrated.

CREATE OR REPLACE FUNCTION public.notify_new_content_webhook(_tipo text, _titulo text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _url text := 'https://tcncngawqeudwjxgcvia.supabase.co/functions/v1/notify-make-new-content';
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

CREATE OR REPLACE FUNCTION public.notify_new_content_webhook(_tipo text, _titulo text, _presenter text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _url text := 'https://tcncngawqeudwjxgcvia.supabase.co/functions/v1/notify-make-new-content';
  _body jsonb;
BEGIN
  IF _titulo IS NULL OR length(trim(_titulo)) = 0 THEN
    RETURN;
  END IF;

  _body := jsonb_build_object('tipo', _tipo, 'titulo', _titulo, 'source', _tipo);
  IF _presenter IS NOT NULL AND length(trim(_presenter)) > 0 THEN
    _body := _body || jsonb_build_object('presenter', _presenter);
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := _body
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_content_webhook(_tipo text, _titulo text, _presenter text DEFAULT NULL::text, _link text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _url text := 'https://tcncngawqeudwjxgcvia.supabase.co/functions/v1/notify-make-new-content';
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

CREATE OR REPLACE FUNCTION public.dispatch_push_on_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  _url   text := 'https://tcncngawqeudwjxgcvia.supabase.co/functions/v1/send-push';
  _key   text;
  _hdrs  jsonb;
  _data  jsonb;
  _target uuid;
BEGIN
  -- Read service role from Vault; if not configured, silently no-op (don't block the insert)
  BEGIN
    SELECT decrypted_secret INTO _key
    FROM vault.decrypted_secrets
    WHERE name = 'push_trigger_service_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    _key := NULL;
  END;

  IF _key IS NULL OR length(trim(_key)) = 0 THEN
    RETURN NEW;
  END IF;

  _hdrs := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || _key
  );

  _data := jsonb_build_object(
    'type', NEW.type,
    'reference_id', NEW.reference_id
  );

  BEGIN
    IF NEW.user_id IS NOT NULL THEN
      PERFORM net.http_post(
        url     := _url,
        headers := _hdrs,
        body    := jsonb_build_object(
          'user_id', NEW.user_id,
          'title',   NEW.title,
          'body',    NEW.message,
          'data',    _data
        )
      );
    ELSE
      -- Broadcast: one request per distinct user that has at least one device token
      FOR _target IN
        SELECT DISTINCT user_id FROM public.push_tokens
      LOOP
        PERFORM net.http_post(
          url     := _url,
          headers := _hdrs,
          body    := jsonb_build_object(
            'user_id', _target,
            'title',   NEW.title,
            'body',    NEW.message,
            'data',    _data
          )
        );
      END LOOP;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Never block notification insert if push dispatch fails
    RAISE WARNING 'dispatch_push_on_notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_centralizer_member_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault'
AS $function$
DECLARE
  _url      text := 'https://tcncngawqeudwjxgcvia.supabase.co/functions/v1/notify-centralizer';
  _key      text;
  _changes  jsonb := '{}'::jsonb;
  _actor    text;
  _record   uuid;
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
    _record := NEW.user_id;
    _actor := COALESCE(NEW.updated_by, 'sistema');
    IF COALESCE(NEW.name, '') IS DISTINCT FROM COALESCE(OLD.name, '') THEN
      _changes := _changes || jsonb_build_object('name', jsonb_build_object('antes', OLD.name, 'depois', NEW.name));
    END IF;
    IF COALESCE(NEW.subscription_status, '') IS DISTINCT FROM COALESCE(OLD.subscription_status, '') THEN
      _changes := _changes || jsonb_build_object('subscription_status', jsonb_build_object('antes', OLD.subscription_status, 'depois', NEW.subscription_status));
    END IF;
  ELSE
    _record := NEW.user_id;
    SELECT COALESCE(p.updated_by, 'sistema') INTO _actor FROM public.profiles p WHERE p.user_id = NEW.user_id;
    IF COALESCE(NEW.phone, '') IS DISTINCT FROM COALESCE(OLD.phone, '') THEN
      _changes := _changes || jsonb_build_object('phone', jsonb_build_object('antes', OLD.phone, 'depois', NEW.phone));
    END IF;
  END IF;

  IF _changes = '{}'::jsonb OR _record IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT decrypted_secret INTO _key
    FROM vault.decrypted_secrets
    WHERE name = 'push_trigger_service_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    _key := NULL;
  END;

  IF _key IS NULL OR length(trim(_key)) = 0 THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := _url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _key
      ),
      body := jsonb_build_object(
        'event_id', gen_random_uuid(),
        'record_id', _record,
        'occurred_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'updated_by', COALESCE(_actor, 'sistema'),
        'changes', _changes
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_centralizer_member_change failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
