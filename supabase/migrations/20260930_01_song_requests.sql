-- Event song requests.
--
-- Guests at an event (e.g. the New Year's Party) open /song-requests, search
-- Spotify and request a track. Clean tracks are added straight to the church
-- Spotify account's live queue; explicit tracks are refused server-side.
--
-- Everything here is service-only: the public page talks to our API routes,
-- which use the service client. Nothing is readable with the anon key, and the
-- Spotify refresh token never leaves the server.

-- ── Session settings (one row) ──────────────────────────────────────────────

create table if not exists public.song_request_settings (
  id int primary key default 1 check (id = 1),
  open boolean not null default false,
  event_name text not null default 'Song requests' check (char_length(event_name) between 1 and 80),
  -- Most tracks that may be waiting at once, and how many one device may have
  -- waiting at once.
  max_queue int not null default 25 check (max_queue between 1 and 200),
  per_device_limit int not null default 3 check (per_device_limit between 1 and 50),
  updated_at timestamptz not null default now()
);

insert into public.song_request_settings (id) values (1) on conflict (id) do nothing;

-- ── The connected Spotify account (one row) ─────────────────────────────────

create table if not exists public.song_request_spotify (
  id int primary key default 1 check (id = 1),
  refresh_token text not null,
  account_name text check (char_length(account_name) <= 120),
  connected_at timestamptz not null default now()
);

-- ── Requests ────────────────────────────────────────────────────────────────

create table if not exists public.song_requests (
  id uuid primary key default gen_random_uuid(),
  spotify_track_id text not null check (char_length(spotify_track_id) between 1 and 64),
  title text not null check (char_length(title) between 1 and 300),
  artist text not null check (char_length(artist) <= 300),
  artwork_url text check (char_length(artwork_url) <= 500),
  status text not null default 'queued' check (status in ('queued', 'played', 'removed')),
  -- Hashes, not raw values: enough to apply limits, not enough to identify.
  device_hash text not null check (char_length(device_hash) <= 64),
  ip_hash text not null check (char_length(ip_hash) <= 64),
  created_at timestamptz not null default now()
);

create index if not exists song_requests_created_idx on public.song_requests (created_at desc);
create index if not exists song_requests_device_idx on public.song_requests (device_hash, status);

-- A track can only be waiting once; once it is played or removed it may be
-- requested again.
create unique index if not exists song_requests_one_queued_per_track
  on public.song_requests (spotify_track_id) where status = 'queued';

alter table public.song_request_settings enable row level security;
alter table public.song_request_spotify enable row level security;
alter table public.song_requests enable row level security;

drop policy if exists "service only" on public.song_request_settings;
drop policy if exists "service only" on public.song_request_spotify;
drop policy if exists "service only" on public.song_requests;
create policy "service only" on public.song_request_settings using (false) with check (false);
create policy "service only" on public.song_request_spotify using (false) with check (false);
create policy "service only" on public.song_requests using (false) with check (false);

comment on table public.song_request_settings is
  'Event song requests: open/closed switch, event name and limits. One row. Service-only.';
comment on table public.song_request_spotify is
  'Event song requests: the church Spotify account refresh token. One row. Service-only; never sent to a client.';
comment on table public.song_requests is
  'Event song requests: tracks guests asked for that were added to the Spotify queue. Service-only; devices and IPs are stored hashed.';
