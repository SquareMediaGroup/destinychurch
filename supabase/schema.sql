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
