-- Destiny One: the scheduled jobs queue (1.2 foundation).
--
-- One table for anything that has to happen at a set time: a leader's
-- scheduled announcement, a poll closing at its deadline, and whatever comes
-- later. A job has a kind, a due time and a small payload; the handler for each
-- kind lives in the API (lib/destinyOne/scheduledJobs.server.ts), so the
-- message checks (paused group, suspended leader, sealing, push) run at send
-- time exactly as for a message typed live.
--
-- /api/cron/destiny-one-scheduled-jobs is called every minute (see the
-- following migration, 20261110_02) and claims what is due with
-- d1_claim_due_jobs(). A claim marks a job 'running' in the same statement
-- that selects it, with FOR UPDATE SKIP LOCKED, so two overlapping runs can
-- never both take the same job: each job is handed out once.
--
-- A run that dies half-way leaves its jobs 'running'. After 5 minutes they are
-- handed out again (at most 3 attempts in all), so a handler must be safe to
-- repeat: it uses the job id as its idempotency key.
--
-- Payloads can hold message text. Handlers seal it (lib/destinyOne/sealing.ts)
-- before it is stored here, like a sent message, so this table never holds
-- plain chat text.

create table if not exists public.d1_scheduled_jobs (
  id bigint generated always as identity primary key,
  kind text not null check (char_length(kind) between 1 and 40),
  run_at timestamptz not null,
  group_id uuid references public.d1_groups (id) on delete cascade,
  created_by uuid references public.d1_members (id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'failed', 'cancelled')),
  attempts integer not null default 0,
  last_error text check (char_length(coalesce(last_error, '')) <= 500),
  claimed_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

-- Only pending and running jobs are ever looked up by time.
create index if not exists d1_scheduled_jobs_due_idx
  on public.d1_scheduled_jobs (run_at)
  where status in ('pending', 'running');
create index if not exists d1_scheduled_jobs_group_idx
  on public.d1_scheduled_jobs (group_id, status);

alter table public.d1_scheduled_jobs enable row level security;
drop policy if exists "service only" on public.d1_scheduled_jobs;
create policy "service only" on public.d1_scheduled_jobs using (false) with check (false);

comment on table public.d1_scheduled_jobs is
  'Things that happen at a set time (scheduled announcements, poll deadlines). Claimed once each by d1_claim_due_jobs().';

-- ── Claim ───────────────────────────────────────────────────────────────────
create or replace function public.d1_claim_due_jobs(p_limit integer default 25)
returns setof public.d1_scheduled_jobs
language sql
security definer
set search_path = ''
as $$
  with due as (
    select id
      from public.d1_scheduled_jobs
     where (status = 'pending' and run_at <= now())
        or (status = 'running' and claimed_at < now() - interval '5 minutes' and attempts < 3)
     order by run_at
     limit greatest(1, least(coalesce(p_limit, 25), 100))
       for update skip locked
  )
  update public.d1_scheduled_jobs j
     set status = 'running',
         claimed_at = now(),
         attempts = j.attempts + 1
    from due
   where j.id = due.id
  returning j.*;
$$;

-- ── Finish ──────────────────────────────────────────────────────────────────
-- No error: done. An error: tried again a minute or two later, up to 3 attempts,
-- then failed for good (and the API tells the admins). A job that was cancelled
-- while it ran stays cancelled.
create or replace function public.d1_finish_job(p_id bigint, p_error text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.d1_scheduled_jobs;
  outcome text;
begin
  select * into job from public.d1_scheduled_jobs where id = p_id for update;
  if not found or job.status <> 'running' then
    return coalesce(job.status, 'missing');
  end if;

  if p_error is null then
    outcome := 'done';
  elsif job.attempts >= 3 then
    outcome := 'failed';
  else
    outcome := 'pending';
  end if;

  update public.d1_scheduled_jobs
     set status = outcome,
         last_error = left(p_error, 500),
         finished_at = case when outcome = 'pending' then null else now() end,
         run_at = case when outcome = 'pending' then now() + (job.attempts * interval '1 minute') else run_at end
   where id = p_id;
  return outcome;
end;
$$;

revoke all on function public.d1_claim_due_jobs(integer) from public, anon, authenticated;
grant execute on function public.d1_claim_due_jobs(integer) to service_role;
revoke all on function public.d1_finish_job(bigint, text) from public, anon, authenticated;
grant execute on function public.d1_finish_job(bigint, text) to service_role;
