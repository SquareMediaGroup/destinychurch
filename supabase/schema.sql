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
  transcript text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

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
