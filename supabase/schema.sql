create extension if not exists "pgcrypto";

create table if not exists sermons (
  id text primary key,
  title text not null,
  date timestamptz,
  podcast_guid text unique,
  podcast_pub_date timestamptz,
  podcast_audio_url text,
  youtube_video_id text,
  youtube_pub_date timestamptz,
  thumbnail_url text,
  summary text,
  summary_points jsonb,
  transcript text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

alter table if exists sermons
  add column if not exists summary_points jsonb;

create table if not exists sermon_link_suggestions (
  id uuid primary key default gen_random_uuid(),
  podcast_guid text,
  youtube_video_id text,
  status text,
  created_at timestamptz default timezone('utc', now())
);

create table if not exists admin_users (
  username text primary key,
  password_hash text not null,
  created_at timestamptz default timezone('utc', now())
);

create table if not exists ai_reports (
  id uuid primary key default gen_random_uuid(),
  sermon_id text,
  issue_type text not null,
  name text not null,
  email text not null,
  description text not null,
  created_at timestamptz default timezone('utc', now())
);

create table if not exists playlists (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  slug text unique not null,
  is_public boolean default true,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references playlists (id) on delete cascade,
  sermon_id text not null references sermons (id) on delete cascade,
  position int not null default 1,
  created_at timestamptz default timezone('utc', now())
);

create index if not exists playlist_items_playlist_position_idx
  on playlist_items (playlist_id, position);

create table if not exists sermon_transcripts (
  sermon_id text primary key references sermons (id) on delete cascade,
  segments jsonb not null,
  status text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create table if not exists auth_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default timezone('utc', now()),
  last_login timestamptz default timezone('utc', now())
);

create table if not exists auth_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used boolean default false,
  created_at timestamptz default timezone('utc', now())
);

create index if not exists auth_codes_email_idx on auth_codes (email);

create table if not exists site_banner (
  id uuid primary key default gen_random_uuid(),
  message text,
  description text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create index if not exists site_banner_updated_idx
  on site_banner (updated_at);

alter table if exists site_banner
  add column if not exists description text;

-- ── Row-Level Security (secure-by-default) ──────────────────────────────────
-- Every table in this base schema is server-accessed only (via the service /
-- secret key, which bypasses RLS). Without RLS enabled, Supabase's default
-- grants make these tables readable AND writable by anyone holding the public
-- anon/publishable key over the REST API. Enable RLS + a deny-all policy so
-- the public role gets nothing. Any table that later needs public read gets its
-- own permissive policy in a migration (see redirects / alpha_events / site_popup).
-- Idempotent: safe to re-run and safe if a table was dropped.
do $$
declare
  t text;
  base_tables text[] := array[
    'sermons', 'sermon_transcripts', 'sermon_link_suggestions', 'ai_reports',
    'playlists', 'playlist_items', 'auth_users', 'auth_codes',
    'admin_users', 'site_banner'
  ];
begin
  foreach t in array base_tables loop
    if exists (
      select 1 from pg_tables where schemaname = 'public' and tablename = t
    ) then
      execute format('alter table public.%I enable row level security', t);
      if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = t and policyname = 'service only'
      ) then
        execute format(
          'create policy "service only" on public.%I using (false) with check (false)', t
        );
      end if;
    end if;
  end loop;
end $$;
