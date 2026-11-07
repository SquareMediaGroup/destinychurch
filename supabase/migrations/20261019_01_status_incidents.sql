-- Status page incidents (status.destinytees.uk, apps/status).
--
-- Posted from /admin/status by Site Admins: an outage, an amber alert
-- (degraded) or planned maintenance, the parts of the website / Destiny One it
-- affects, and a timeline of updates so members can see how a fix is going.
--
-- The status page reads both tables with the publishable key, so SELECT is
-- public: everything here is written to be published. Writes go through the
-- admin API with the service client only.
--
-- author_name: the poster's admin_roles.name, copied at post time and shown
-- publicly as the notice's heading (and on each update), so renaming or
-- removing an admin later doesn't rewrite history.
--
-- long_outage_alerted_at: set by /api/cron/status-outage-alerts once it has
-- emailed the Site Admins about an outage still open after an hour, so they
-- get one email per outage.

create table if not exists public.status_incidents (
  id                      bigint generated always as identity primary key,
  title                   text not null check (char_length(title) between 1 and 200),
  kind                    text not null check (kind in ('outage', 'degraded', 'maintenance')),
  components              text[] not null default '{}',
  started_at              timestamptz not null default now(),
  resolved_at             timestamptz,
  long_outage_alerted_at  timestamptz,
  author_name             text,
  created_by              uuid,
  created_at              timestamptz not null default now()
);

create table if not exists public.status_incident_updates (
  id           bigint generated always as identity primary key,
  incident_id  bigint not null references public.status_incidents(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 2000),
  author_name  text,
  created_by   uuid,
  created_at   timestamptz not null default now()
);

create index if not exists status_incidents_open_idx on public.status_incidents (started_at desc) where resolved_at is null;
create index if not exists status_incidents_resolved_idx on public.status_incidents (resolved_at desc);
create index if not exists status_incident_updates_incident_idx on public.status_incident_updates (incident_id, created_at);

alter table public.status_incidents enable row level security;
alter table public.status_incident_updates enable row level security;

drop policy if exists "public read" on public.status_incidents;
drop policy if exists "public read" on public.status_incident_updates;
create policy "public read" on public.status_incidents for select using (true);
create policy "public read" on public.status_incident_updates for select using (true);

-- No insert/update/delete policies: RLS denies them to anon and
-- authenticated, and the service role bypasses RLS.
revoke insert, update, delete on public.status_incidents from anon, authenticated;
revoke insert, update, delete on public.status_incident_updates from anon, authenticated;
grant select on public.status_incidents to anon, authenticated;
grant select on public.status_incident_updates to anon, authenticated;
