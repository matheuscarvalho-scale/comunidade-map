
DO $$
DECLARE
  job RECORD;
  cron_secret text := 'c567b0f65239b7ffe32e479a24c3d353';
  fn_url text;
  fn_name text;
BEGIN
  FOR job IN
    SELECT jobid, jobname, schedule, command
    FROM cron.job
    WHERE command LIKE '%check-churn-alerts%'
       OR command LIKE '%send-spreadsheet-email%'
       OR command LIKE '%process-webinar-reminders%'
       OR command LIKE '%process-mentoring-reminders%'
  LOOP
    IF job.command LIKE '%check-churn-alerts%' THEN
      fn_name := 'check-churn-alerts';
    ELSIF job.command LIKE '%send-spreadsheet-email%' THEN
      fn_name := 'send-spreadsheet-email';
    ELSIF job.command LIKE '%process-webinar-reminders%' THEN
      fn_name := 'process-webinar-reminders';
    ELSIF job.command LIKE '%process-mentoring-reminders%' THEN
      fn_name := 'process-mentoring-reminders';
    END IF;

    fn_url := 'https://okcrzsygpzdlayewtgis.supabase.co/functions/v1/' || fn_name;

    PERFORM cron.alter_job(
      job_id   := job.jobid,
      schedule := job.schedule,
      command  := format(
        $cmd$SELECT net.http_post(
          url:='%s',
          headers:='{"Content-Type":"application/json","x-cron-secret":"%s"}'::jsonb,
          body:='{}'::jsonb
        ) AS request_id;$cmd$,
        fn_url, cron_secret
      )
    );

    RAISE NOTICE 'Updated cron job % (%) -> %', job.jobid, job.jobname, fn_name;
  END LOOP;
END $$;
