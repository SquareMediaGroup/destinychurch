-- The minimum of Supabase's own schemas that the migrations under test touch,
-- so they can be exercised against a throwaway vanilla Postgres
-- (scripts/test-sql.sh). Shapes follow Supabase closely enough for the
-- migration to apply; behaviour is simplified:
--
--   auth.uid()        reads the `test.uid` setting instead of a JWT claim
--   realtime.send()   records the broadcast in realtime.messages so tests can
--                     assert what would have been sent, and to whom
--   realtime.topic()  reads `test.topic`

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end;
$$;

create extension if not exists pgcrypto;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;

create schema if not exists realtime;
create table if not exists realtime.messages (
  id bigint generated always as identity primary key,
  topic text not null,
  extension text not null,
  event text,
  payload jsonb,
  private boolean,
  inserted_at timestamptz not null default now()
);
alter table realtime.messages enable row level security;
create or replace function realtime.topic() returns text language sql stable as $$
  select current_setting('test.topic', true)
$$;
create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true)
returns void language sql as $$
  insert into realtime.messages (topic, extension, event, payload, private)
  values (topic, 'broadcast', event, payload, private);
$$;

create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

-- Tables from earlier migrations that this one extends or writes to.
create table if not exists public.admin_roles (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  training_admin boolean not null default false,
  event_admin boolean not null default false,
  store_admin boolean not null default false,
  site_admin boolean not null default false,
  host boolean not null default false,
  hr_admin boolean not null default false,
  design_admin boolean not null default false,
  sermon_admin boolean not null default false,
  super_admin boolean not null default false
);

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  section text not null,
  kind text not null,
  entity_id text,
  entity_label text,
  summary text not null,
  href text not null,
  roles text[] not null,
  metadata jsonb
);
