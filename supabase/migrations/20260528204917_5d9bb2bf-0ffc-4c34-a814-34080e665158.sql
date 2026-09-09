-- Remove cron jobs antigos e recria com source identificador
SELECT cron.unschedule('notify-make-daily-event-8am-brt');
SELECT cron.unschedule('notify-make-monday-8h-brt');
SELECT cron.unschedule('notify-make-thursday-18h-brt');
SELECT cron.unschedule('notify-make-wednesday-19h-brt');

SELECT cron.schedule(
  'notify-make-daily-event-8am-brt',
  '0 11 * * 4',
  'SELECT net.http_post(
    url := ''https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/notify-make-daily-event?source=quinta_8h'',
    headers := ''{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rY3J6c3lncHpkbGF5ZXd0Z2lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMDEzMTEsImV4cCI6MjA0NjU3MjExMX0.N6Mea2BSRE5j2-5ctiJe8NSYOMWDnPrcxlGD3p-CdeQ"}''::jsonb,
    body := jsonb_build_object(''triggered_at'', now())
  ) AS request_id;'
);

SELECT cron.schedule(
  'notify-make-monday-8h-brt',
  '0 11 * * 1',
  'SELECT net.http_post(
    url := ''https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/notify-make-daily-event?days_ahead=3&source=segunda_8h'',
    headers := ''{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rY3J6c3lncHpkbGF5ZXd0Z2lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMDEzMTEsImV4cCI6MjA0NjU3MjExMX0.N6Mea2BSRE5j2-5ctiJe8NSYOMWDnPrcxlGD3p-CdeQ"}''::jsonb,
    body := jsonb_build_object(''triggered_at'', now())
  ) AS request_id;'
);

SELECT cron.schedule(
  'notify-make-thursday-18h-brt',
  '0 21 * * 4',
  'SELECT net.http_post(
    url := ''https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/notify-make-daily-event?source=quinta_18h'',
    headers := ''{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rY3J6c3lncHpkbGF5ZXd0Z2lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMDEzMTEsImV4cCI6MjA0NjU3MjExMX0.N6Mea2BSRE5j2-5ctiJe8NSYOMWDnPrcxlGD3p-CdeQ"}''::jsonb,
    body := jsonb_build_object(''triggered_at'', now())
  ) AS request_id;'
);

SELECT cron.schedule(
  'notify-make-wednesday-19h-brt',
  '0 22 * * 3',
  'SELECT net.http_post(
    url := ''https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/notify-make-daily-event?days_ahead=1&source=quarta_19h'',
    headers := ''{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rY3J6c3lncHpkbGF5ZXd0Z2lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMDEzMTEsImV4cCI6MjA0NjU3MjExMX0.N6Mea2BSRE5j2-5ctiJe8NSYOMWDnPrcxlGD3p-CdeQ"}''::jsonb,
    body := jsonb_build_object(''triggered_at'', now())
  ) AS request_id;'
);