-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Helper to upsert the service role into Vault (called by edge function with service role)
CREATE OR REPLACE FUNCTION public.set_push_trigger_secret(_value text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  _id uuid;
BEGIN
  SELECT id INTO _id FROM vault.secrets WHERE name = 'push_trigger_service_key';
  IF _id IS NULL THEN
    SELECT vault.create_secret(_value, 'push_trigger_service_key', 'Service role key used by notifications trigger to invoke send-push') INTO _id;
  ELSE
    PERFORM vault.update_secret(_id, _value, 'push_trigger_service_key', 'Service role key used by notifications trigger to invoke send-push');
  END IF;
  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_push_trigger_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_push_trigger_secret(text) TO service_role;

-- Trigger function: fire push for each new notification
CREATE OR REPLACE FUNCTION public.dispatch_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  _url   text := 'https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/send-push';
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
$$;

-- Trigger
DROP TRIGGER IF EXISTS trg_dispatch_push_on_notification ON public.notifications;
CREATE TRIGGER trg_dispatch_push_on_notification
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.dispatch_push_on_notification();