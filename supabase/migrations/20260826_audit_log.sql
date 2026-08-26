-- The admin audit log — one row for every change an admin makes.
--
-- Why a table rather than reading Postgres/Vercel logs: the question people
-- actually ask is "who added that to the store", and answering it needs the
-- *actor* (a person, not a service-role key), the *thing* (a product with a
-- name, not a uuid) and the *change* (which fields moved, from what to what).
-- None of that survives in a request log, and Supabase's own logs are 1-day
-- retention on the free tiers. So the app writes its own trail, in the one
-- vocabulary the admin already uses — sections, entities and plain sentences.
--
-- Written exclusively by lib/audit.server.ts's recordAudit(), read only by
-- Super Admins through /admin/audit and the weekly report cron. Deliberately
-- append-only from the app's point of view: nothing in the codebase updates or
-- deletes a row except the retention purge in the weekly cron.
--
-- Note there is NO foreign key from actor_id to auth.users. Removing someone's
-- admin login is itself one of the things this table exists to record, and an
-- `on delete set null`/`cascade` would quietly erase their history at exactly
-- the moment it matters most. The email is denormalised for the same reason.

create table if not exists audit_log (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),

  -- Who. Null only for system/cron-initiated entries.
  actor_id     uuid,
  actor_email  text,
  -- Snapshot of the roles they held at the time, not a live join: "they were a
  -- Store Admin when they did this" stays true after their access changes.
  actor_roles  text[] not null default '{}',

  -- What. `action` is the verb (create/update/delete/…), `section` the admin
  -- area (store/hr/posts/…), `entity` the kind of thing ("product"), and
  -- entity_label the human name of it ("Faith Hoodie") captured at the time.
  action       text not null,
  section      text not null,
  entity       text not null,
  entity_id    text,
  entity_label text,

  -- One plain-English sentence. This is what the search box matches on and
  -- what the AI reads, so it is written for a person, not a parser.
  summary      text not null,

  -- { field: { from, to } } for updates; the created/deleted row for the rest.
  -- Long values are truncated by recordAudit() before they get here.
  changes      jsonb,
  -- Anything else worth keeping that isn't a field change (order totals, the
  -- paths a cache clear touched, why a login failed).
  metadata     jsonb,

  -- Request context, for the "deep detail" view.
  method       text,
  path         text,
  ip           text,
  user_agent   text
);

alter table audit_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'audit_log' and policyname = 'service only'
  ) then
    create policy "service only" on audit_log using (false) with check (false);
  end if;
end $$;

-- The log is read newest-first and filtered by actor/section/entity; every
-- index below is (column, created_at desc) so the filter and the ordering are
-- served by the same scan.
create index if not exists audit_log_created_at_idx on audit_log (created_at desc);
create index if not exists audit_log_actor_idx on audit_log (actor_email, created_at desc);
create index if not exists audit_log_section_idx on audit_log (section, created_at desc);
create index if not exists audit_log_action_idx on audit_log (action, created_at desc);
create index if not exists audit_log_entity_idx on audit_log (entity, entity_id);

-- Free-text search is `ilike` over summary/entity_label rather than a tsvector:
-- at a few thousand rows a week it is instant, and it matches partial words
-- ("hood" → "Faith Hoodie"), which is what someone typing into the box wants.


-- Weekly AI reports.
--
-- Kept rather than only emailed so the report is still there when the email is
-- lost, and so /admin/audit can show the run of them as a history of the
-- admin's activity week by week.
create table if not exists audit_reports (
  id           uuid primary key default gen_random_uuid(),
  period_start timestamptz not null,
  period_end   timestamptz not null,
  -- One-line headline for the list; body is markdown from the model.
  headline     text,
  body         text not null,
  -- Counts by actor/section/action — computed in SQL-land, not by the model,
  -- so the numbers in the report are always right even if the prose isn't.
  stats        jsonb not null default '{}'::jsonb,
  entry_count  integer not null default 0,
  emailed_to   text[] not null default '{}',
  created_at   timestamptz not null default now()
);

alter table audit_reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'audit_reports' and policyname = 'service only'
  ) then
    create policy "service only" on audit_reports using (false) with check (false);
  end if;
end $$;

-- One report per period: a re-run of the cron updates its report rather than
-- adding a second one (see app/api/cron/audit-weekly-report/route.ts).
create unique index if not exists audit_reports_period_idx
  on audit_reports (period_start, period_end);

create index if not exists audit_reports_created_at_idx
  on audit_reports (created_at desc);
