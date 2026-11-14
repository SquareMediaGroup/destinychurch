-- Destiny One: call the scheduled jobs endpoint every minute.
--
-- The site is on the Vercel Hobby plan, which only allows daily crons, and a
-- GitHub Actions schedule can run many minutes late, so the every-minute tick
-- comes from the database: pg_cron fires, pg_net makes the web request.
--
-- APPLY THIS ONLY AFTER /api/cron/destiny-one-scheduled-jobs IS DEPLOYED and the
-- secret below is stored. Until then there is nothing to call.
--
-- The request carries the site's CRON_SECRET as a Bearer token, like the other
-- /api/cron routes. It is read from Supabase Vault under the name
-- 'd1_cron_secret', so it is never in this file or in the cron table. Store it
-- once, by hand, in the SQL editor (the same value as the CRON_SECRET env var on
-- Vercel):
--
--   select vault.create_secret('<the CRON_SECRET value>', 'd1_cron_secret');
--
-- With no secret stored the job selects no row and sends nothing.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Re-running this migration replaces the schedule rather than doubling it.
select cron.unschedule(jobid) from cron.job where jobname = 'd1-scheduled-jobs';

select cron.schedule(
  'd1-scheduled-jobs',
  '* * * * *',
  $job$
  select net.http_get(
    url := 'https://destinychurch.vercel.app/api/cron/destiny-one-scheduled-jobs',
    headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
    timeout_milliseconds := 20000
  )
  from vault.decrypted_secrets s
  where s.name = 'd1_cron_secret'
  $job$
);
