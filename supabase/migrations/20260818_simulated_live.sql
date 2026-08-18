-- Simulated live — playing a pre-uploaded YouTube video as if it were a
-- broadcast, the way Church Online Platform does it.
--
-- The whole feature is one row and one idea: a video id plus the instant the
-- "broadcast" starts. Everything else is derived. Nobody is streaming anything;
-- every viewer simply loads the same video seeked to `now - starts_at`, so
-- someone who opens /live twenty minutes in joins twenty minutes in, exactly
-- like a real stream. When `starts_at + duration_seconds` passes, the page goes
-- off air on its own.
--
-- Why a singleton rather than a schedule table: /live shows one thing at a
-- time, and a list of scheduled simulcasts would need conflict rules,
-- overlap resolution and a picker for "which one is on air right now" — all to
-- express something the church currently does once a week. If recurring
-- simulated services are wanted later, this row becomes the resolved *current*
-- broadcast and a `simulated_live_schedule` table feeds it.
--
-- A real broadcast always wins. lib/liveStatus.server.ts checks YouTube first
-- and only falls through to this row when the channel genuinely isn't live, so
-- a simulated event left switched on can never hide an actual service.

create table if not exists public.simulated_live (
  id integer primary key default 1,
  constraint simulated_live_singleton check (id = 1),

  -- Admin intent. Whether it is *on air* is `active` plus the clock — see the
  -- phase helpers in lib/simulatedLive.ts.
  active boolean not null default false,

  -- The 11-character YouTube id. Public, unlisted and scheduled-premiere
  -- uploads all work; private ones do not (the embed refuses to play them).
  video_id text,

  -- Shown as the broadcast title on /live. Seeded from the YouTube snippet when
  -- the admin pastes a link, then editable — the upload is often named for the
  -- archive ("Sunday 17 Aug FINAL EXPORT") rather than for the congregation.
  title text,

  -- When the simulated broadcast begins. The single source of the playhead:
  -- position = now - starts_at, identically for every viewer.
  starts_at timestamptz,

  -- Runtime of the video, resolved from contentDetails.duration when the link
  -- is saved. Stored rather than fetched per request because it is the only
  -- thing that says when to go off air, and it must keep working if the
  -- YouTube API key is missing or out of quota.
  duration_seconds integer,

  -- Optional line under the player, e.g. "Recorded at our 11am service".
  -- Null by default: simulating live is the point, and whether to say so is a
  -- judgement for the church, not for this table.
  notice text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Cannot go on air with nothing to play, no start time, or no idea when to
  -- stop. Enforced here so a half-filled row can be saved as a draft but never
  -- switched on.
  constraint simulated_live_ready_when_active check (
    not active
    or (video_id is not null and starts_at is not null and duration_seconds is not null)
  ),
  constraint simulated_live_video_id_format
    check (video_id is null or video_id ~ '^[A-Za-z0-9_-]{11}$'),
  constraint simulated_live_duration_positive
    check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 86400)),
  constraint simulated_live_title_len
    check (title is null or char_length(title) <= 200),
  constraint simulated_live_notice_len
    check (notice is null or char_length(notice) <= 200)
);

insert into public.simulated_live (id) values (1) on conflict (id) do nothing;

-- Secure-by-default, matching featured_event and the rest of the base tables:
-- RLS on + deny-all. Reads and writes both go through createServiceClient()
-- (lib/simulatedLive.server.ts and the /api/admin routes), which bypasses RLS;
-- anon and authenticated get nothing directly.
alter table public.simulated_live enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'simulated_live'
      and policyname = 'service only'
  ) then
    create policy "service only" on public.simulated_live
      using (false) with check (false);
  end if;
end $$;
