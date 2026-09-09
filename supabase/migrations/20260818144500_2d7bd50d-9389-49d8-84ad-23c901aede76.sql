CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;

CREATE OR REPLACE FUNCTION public.notify_centralizer_member_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  _url      text := 'https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/notify-centralizer';
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
$$;

REVOKE ALL ON FUNCTION public.notify_centralizer_member_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_centralizer_profiles ON public.profiles;
CREATE TRIGGER trg_notify_centralizer_profiles
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.notify_centralizer_member_change();

DROP TRIGGER IF EXISTS trg_notify_centralizer_profiles_private ON public.profiles_private;
CREATE TRIGGER trg_notify_centralizer_profiles_private
AFTER UPDATE ON public.profiles_private
FOR EACH ROW EXECUTE FUNCTION public.notify_centralizer_member_change();