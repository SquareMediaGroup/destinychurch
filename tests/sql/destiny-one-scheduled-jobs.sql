-- The scheduled jobs queue (migration 20261110_01_destiny_one_scheduled_jobs.sql).
-- Run with: scripts/test-sql.sh destiny-one-scheduled-jobs
-- (The cron schedule in 20261110_02 needs pg_cron and pg_net, which a vanilla
-- Postgres doesn't have, so it isn't applied here.)

\set ON_ERROR_STOP on
set client_min_messages = warning;

create or replace function pg_temp.expect_error(stmt text, fragment text)
returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'EXPECTED FAILURE did not happen: %', stmt;
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if position(fragment in sqlerrm) = 0 then
    raise exception 'Wrong error for %: got "%", wanted "%"', stmt, sqlerrm, fragment;
  end if;
end;
$$;

create or replace function pg_temp.check(ok boolean, label text)
returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then
    raise exception 'FAILED: %', label;
  end if;
  raise notice 'ok - %', label;
end;
$$;

set client_min_messages = notice;

-- ── Browser keys get nothing ────────────────────────────────────────────────
set role anon;
select pg_temp.expect_error('select * from public.d1_scheduled_jobs', 'permission denied');
select pg_temp.expect_error('select * from public.d1_claim_due_jobs(5)', 'permission denied');
reset role;

set role authenticated;
select pg_temp.expect_error('select * from public.d1_scheduled_jobs', 'permission denied');
select pg_temp.expect_error('select * from public.d1_claim_due_jobs(5)', 'permission denied');
select pg_temp.expect_error('select public.d1_finish_job(1, null)', 'permission denied');
reset role;
select pg_temp.check(true, 'anon and authenticated cannot read the queue or call its functions');

-- ── Claiming: due jobs, once each ───────────────────────────────────────────
insert into public.d1_scheduled_jobs (kind, run_at, payload) values
  ('a', now() - interval '3 minutes', '{"n":1}'),
  ('b', now() + interval '1 hour', '{"n":2}'),
  ('c', now() - interval '1 minute', '{"n":3}');

create temp table claimed1 as select * from public.d1_claim_due_jobs(25);
select pg_temp.check((select count(*) from claimed1) = 2, 'only the two due jobs are claimed');
select pg_temp.check((select array_agg(kind order by run_at) from claimed1) = array['a', 'c'], 'claimed in due order');
select pg_temp.check((select bool_and(status = 'running' and attempts = 1 and claimed_at is not null) from claimed1), 'a claim marks the job running, attempt 1');
select pg_temp.check((select status from public.d1_scheduled_jobs where kind = 'b') = 'pending', 'a job that is not due stays pending');

create temp table claimed2 as select * from public.d1_claim_due_jobs(25);
select pg_temp.check((select count(*) from claimed2) = 0, 'a second run finds nothing: each job is handed out once');

-- ── Finishing ───────────────────────────────────────────────────────────────
select pg_temp.check(public.d1_finish_job((select id from public.d1_scheduled_jobs where kind = 'a'), null) = 'done', 'finishing without an error is done');
select pg_temp.check((select finished_at is not null and last_error is null from public.d1_scheduled_jobs where kind = 'a'), 'done jobs are stamped finished');
select pg_temp.check(public.d1_finish_job((select id from public.d1_scheduled_jobs where kind = 'a'), 'late error') = 'done', 'finishing a finished job changes nothing');
select pg_temp.check((select status from public.d1_scheduled_jobs where kind = 'a') = 'done', 'a done job stays done');

-- An error on attempt 1 puts it back, a minute out: not claimable straight away.
select pg_temp.check(public.d1_finish_job((select id from public.d1_scheduled_jobs where kind = 'c'), 'group is paused') = 'pending', 'an error on attempt 1 retries');
select pg_temp.check(
  (select status = 'pending' and last_error = 'group is paused' and finished_at is null and run_at > now() from public.d1_scheduled_jobs where kind = 'c'),
  'a retry waits a minute and keeps the error');
select pg_temp.check((select count(*) from public.d1_claim_due_jobs(25)) = 0, 'a job waiting to retry is not claimed early');

-- Once its time comes it is claimed again, and the third failure is final.
update public.d1_scheduled_jobs set run_at = now() - interval '1 second' where kind = 'c';
select pg_temp.check((select count(*) from public.d1_claim_due_jobs(25)) = 1, 'a retry is claimed once its time comes');
select pg_temp.check((select attempts from public.d1_scheduled_jobs where kind = 'c') = 2, 'and counts as attempt 2');
select pg_temp.check(public.d1_finish_job((select id from public.d1_scheduled_jobs where kind = 'c'), 'again') = 'pending', 'an error on attempt 2 retries');
update public.d1_scheduled_jobs set run_at = now() - interval '1 second' where kind = 'c';
select count(*) from public.d1_claim_due_jobs(25);
select pg_temp.check(public.d1_finish_job((select id from public.d1_scheduled_jobs where kind = 'c'), 'third time') = 'failed', 'an error on attempt 3 fails for good');
select pg_temp.check((select status = 'failed' and finished_at is not null from public.d1_scheduled_jobs where kind = 'c'), 'failed jobs are stamped finished');
update public.d1_scheduled_jobs set run_at = now() - interval '1 second' where kind = 'c';
select pg_temp.check((select count(*) from public.d1_claim_due_jobs(25)) = 0, 'a failed job is never claimed again');
select pg_temp.check(public.d1_finish_job(-1, null) = 'missing', 'finishing a job that does not exist says so');

-- ── A run that died ─────────────────────────────────────────────────────────
insert into public.d1_scheduled_jobs (kind, run_at, status, attempts, claimed_at) values
  ('stuck', now() - interval '20 minutes', 'running', 1, now() - interval '10 minutes'),
  ('busy', now() - interval '20 minutes', 'running', 1, now() - interval '1 minute'),
  ('spent', now() - interval '20 minutes', 'running', 3, now() - interval '10 minutes');
create temp table claimed3 as select * from public.d1_claim_due_jobs(25);
select pg_temp.check((select array_agg(kind) from claimed3) = array['stuck'], 'a job left running for over 5 minutes is handed out again');
select pg_temp.check((select attempts from claimed3) = 2, 'and counts the extra attempt');
select pg_temp.check((select status from public.d1_scheduled_jobs where kind = 'busy') = 'running', 'one still being worked on is left alone');
select pg_temp.check((select status from public.d1_scheduled_jobs where kind = 'spent') = 'running', 'one that has used its 3 attempts is not handed out again');

-- ── Cancelled ───────────────────────────────────────────────────────────────
insert into public.d1_scheduled_jobs (kind, run_at, status) values ('cancelled-job', now() - interval '1 hour', 'cancelled');
select pg_temp.check((select count(*) from public.d1_claim_due_jobs(25)) = 0, 'a cancelled job is never claimed');
select pg_temp.check(public.d1_finish_job((select id from public.d1_scheduled_jobs where kind = 'cancelled-job'), null) = 'cancelled', 'finishing a cancelled job leaves it cancelled');

-- ── Batch size ──────────────────────────────────────────────────────────────
insert into public.d1_scheduled_jobs (kind, run_at)
  select 'bulk', now() - interval '1 hour' + (g * interval '1 second') from generate_series(1, 7) g;
select pg_temp.check((select count(*) from public.d1_claim_due_jobs(3)) = 3, 'a run takes no more than the limit');
select pg_temp.check((select count(*) from public.d1_claim_due_jobs(null)) = 4, 'the rest follow on the next run');

-- ── Rules on the row ────────────────────────────────────────────────────────
select pg_temp.expect_error($$insert into public.d1_scheduled_jobs (kind, run_at) values ('', now())$$, 'check');
select pg_temp.expect_error($$insert into public.d1_scheduled_jobs (kind, run_at, status) values ('x', now(), 'sent')$$, 'check');
select pg_temp.check(true, 'an empty kind or an unknown status is refused');
