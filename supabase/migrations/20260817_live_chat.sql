-- Live chat for /live — our own version of the Church Online Platform.
--
-- Four surfaces, all carried on Supabase Realtime Broadcast:
--   public    — everyone watching the stream sees it
--   backstage — signed-in Hosts only, for coordinating during a service
--   direct    — a 1:1 thread between one Host and one guest
--   prayer    — never broadcast publicly; lands in a Host queue (own table)
--
-- Two decisions worth knowing before reading the rest.
--
-- 1. Nobody has an account. A guest is an HMAC-signed cookie (lib/liveChatGuest.ts)
--    holding a random id and a display name — no email, no auth.users row. The id
--    is what a mute is applied to, which is why the cookie is signed: an unsigned
--    one could be edited to shed a mute.
--
-- 2. Clients receive but never send. Every table here is deny-all like the rest of
--    the schema (see 20260711_rls_harden_base_tables.sql); the browser never
--    touches Postgres. Messages are posted to an API route, moderated there, and
--    only then pushed onto a channel by live_chat_emit(). The alternative —
--    Postgres Changes with an anon SELECT policy — would have meant opening the
--    table to the anon key and shipping held messages to the very people they were
--    held from. See 20260711_02_fix_public_write_policies.sql for what that class
--    of mistake looks like in this repo.

-- ── Sessions ────────────────────────────────────────────────────────────────
-- One row per broadcast. `state` is what actually gates the chat: the panel on
-- /live follows the YouTube live status, but a Host can open the room early,
-- pause it mid-service, or close it without the stream having ended.

create table if not exists public.live_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  video_id text,
  title text,
  state text not null default 'closed' check (state in ('closed', 'open', 'paused')),
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_chat_sessions_title_len
    check (char_length(coalesce(title, '')) <= 200)
);

-- At most one session per broadcast, so a race between two Hosts opening the
-- room can't produce two rooms nobody shares.
create unique index if not exists live_chat_sessions_video_id_key
  on public.live_chat_sessions (video_id)
  where video_id is not null;

create index if not exists live_chat_sessions_state_idx
  on public.live_chat_sessions (state, created_at desc);

-- ── Messages ────────────────────────────────────────────────────────────────
-- `status` carries the moderation decision:
--   visible — cleared the filter, on the channel
--   held    — tripped the word filter; shown to its author and to Hosts only,
--             until a Host approves it (→ visible) or bins it (→ hidden)
--   hidden  — deleted by a Host, or rejected from the held queue
--
-- Held and hidden rows are kept rather than deleted so there is something to
-- look at if an incident needs reviewing. live_chat_purge() clears the lot
-- after 7 days.

create table if not exists public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_chat_sessions (id) on delete cascade,
  channel text not null check (channel in ('public', 'backstage', 'direct')),
  -- For `direct`, the guest id whose thread this is. Null on the other channels.
  thread_key text,
  author_kind text not null check (author_kind in ('guest', 'host')),
  author_guest_id text,
  author_user_id uuid references auth.users (id) on delete set null,
  display_name text not null,
  body text not null,
  status text not null default 'visible' check (status in ('visible', 'held', 'hidden')),
  held_reason text,
  moderated_by uuid references auth.users (id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint live_chat_messages_body_len
    check (char_length(body) between 1 and 500),
  constraint live_chat_messages_name_len
    check (char_length(display_name) between 1 and 40),
  -- A guest message must say which guest; a host message must say which user.
  constraint live_chat_messages_author_identified
    check (
      (author_kind = 'guest' and author_guest_id is not null)
      or (author_kind = 'host' and author_user_id is not null)
    ),
  -- Direct threads must name their guest; the other channels must not.
  constraint live_chat_messages_thread_key_shape
    check (
      (channel = 'direct' and thread_key is not null)
      or (channel <> 'direct' and thread_key is null)
    ),
  -- Guests can't post backstage. Belt and braces — the API enforces this too.
  constraint live_chat_messages_backstage_is_host_only
    check (channel <> 'backstage' or author_kind = 'host')
);

create index if not exists live_chat_messages_room_idx
  on public.live_chat_messages (session_id, channel, created_at desc);

-- The held queue is small and read on every Host poll; keep it out of the big index.
create index if not exists live_chat_messages_held_idx
  on public.live_chat_messages (session_id, created_at)
  where status = 'held';

create index if not exists live_chat_messages_thread_idx
  on public.live_chat_messages (session_id, thread_key, created_at)
  where channel = 'direct';

create index if not exists live_chat_messages_author_idx
  on public.live_chat_messages (author_guest_id, created_at desc)
  where author_guest_id is not null;

-- ── Prayer requests ─────────────────────────────────────────────────────────
-- Deliberately a separate table rather than a fourth channel: these must never
-- be reachable by the code paths that publish to the public channel, and a
-- table boundary makes that impossible rather than merely unlikely.

create table if not exists public.live_chat_prayer_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.live_chat_sessions (id) on delete cascade,
  guest_id text,
  display_name text not null,
  body text not null,
  status text not null default 'new' check (status in ('new', 'praying', 'done')),
  claimed_by uuid references auth.users (id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint live_chat_prayer_body_len
    check (char_length(body) between 1 and 1000),
  constraint live_chat_prayer_name_len
    check (char_length(display_name) between 1 and 40)
);

create index if not exists live_chat_prayer_queue_idx
  on public.live_chat_prayer_requests (status, created_at desc);

-- ── Blocks (mutes) ──────────────────────────────────────────────────────────
-- scope='session' mutes for the rest of one service; scope='global' carries
-- across services (session_id null). expires_at null means "until lifted".

create table if not exists public.live_chat_blocks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.live_chat_sessions (id) on delete cascade,
  guest_id text not null,
  scope text not null default 'session' check (scope in ('session', 'global')),
  reason text,
  blocked_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint live_chat_blocks_scope_shape
    check (
      (scope = 'session' and session_id is not null)
      or (scope = 'global' and session_id is null)
    )
);

create index if not exists live_chat_blocks_lookup_idx
  on public.live_chat_blocks (guest_id, scope);

-- ── RLS: deny-all, service key only ─────────────────────────────────────────
-- The house pattern. Every read and write goes through createServiceClient();
-- the browser reaches this data only through an API route that has already
-- decided what the caller is allowed to see.

do $$
declare
  t text;
begin
  foreach t in array array[
    'live_chat_sessions',
    'live_chat_messages',
    'live_chat_prayer_requests',
    'live_chat_blocks'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "service only" on public.%I', t);
    execute format(
      'create policy "service only" on public.%I for all to anon, authenticated using (false) with check (false)',
      t
    );
  end loop;
end $$;

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Delivery is Broadcast, not Postgres Changes — Supabase's own guidance, and the
-- only option that keeps the tables above deny-all.
--
-- This is a function the API calls rather than an AFTER INSERT trigger, on
-- purpose: a trigger fires on every row and cannot tell a held message from a
-- cleared one, so it would leak exactly the messages the filter caught. The
-- caller decides the topic, which means the caller decides the audience.

create or replace function public.live_chat_emit(
  topic text,
  event text,
  payload jsonb
)
returns void
security definer
set search_path = ''
language plpgsql
as $$
begin
  perform realtime.send(payload, event, topic, true);
end;
$$;

comment on function public.live_chat_emit(text, text, jsonb) is
  'Pushes one live-chat event onto a private Realtime topic. Called by the API routes with the service key after moderation has run.';

-- Host check for the channel policies below. SECURITY DEFINER because
-- admin_roles is deny-all (20260807_admin_roles.sql) — a plain subquery in the
-- policy would be filtered to zero rows for the authenticated role and every
-- Host would silently fail to join the backstage channel.

create or replace function public.is_live_chat_host()
returns boolean
security definer
set search_path = ''
language sql
stable
as $$
  select exists (
    select 1
    from public.admin_roles r
    where r.auth_user_id = (select auth.uid())
      and (r.host or r.super_admin)
  );
$$;

comment on function public.is_live_chat_host() is
  'True when the signed-in user holds the host (or super_admin) access level. Used by the realtime.messages policies.';

-- Postgres grants EXECUTE to PUBLIC on new functions by default; stated
-- explicitly so a future default-privileges change doesn't quietly lock Hosts out.
grant execute on function public.is_live_chat_host() to anon, authenticated;

-- Channel authorization. Topics are:
--   live-chat:<session uuid>:public          — anyone, including signed-out guests
--   live-chat:<session uuid>:host            — Hosts only (backstage, held queue, prayer)
--   live-chat:<session uuid>:dm:<dm key>     — one guest's direct thread
--
-- The dm key is an HMAC of the guest id (lib/liveChatGuest.ts), so the topic
-- name is itself the capability: unguessable without the server secret, and
-- never included in anything sent to another client.
--
-- Patterns are anchored regexes rather than LIKE so the three cannot overlap —
-- a crafted topic such as 'live-chat:x:host:public' matches neither.

drop policy if exists "live_chat_public_receive" on realtime.messages;
create policy "live_chat_public_receive"
  on realtime.messages for select
  to anon, authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) ~ '^live-chat:[0-9a-f-]{36}:public$'
  );

drop policy if exists "live_chat_dm_receive" on realtime.messages;
create policy "live_chat_dm_receive"
  on realtime.messages for select
  to anon, authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) ~ '^live-chat:[0-9a-f-]{36}:dm:[0-9a-f]{32}$'
  );

drop policy if exists "live_chat_host_receive" on realtime.messages;
create policy "live_chat_host_receive"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) ~ '^live-chat:[0-9a-f-]{36}:host$'
    and (select public.is_live_chat_host())
  );

-- Presence, so the panel can show how many people are watching together.
-- This is the ONLY insert policy on realtime.messages for these topics: there is
-- deliberately no broadcast insert policy, so a client holding the anon key can
-- announce itself but can never put a message — least of all one wearing a HOST
-- badge — onto a channel.
drop policy if exists "live_chat_presence_only" on realtime.messages;
create policy "live_chat_presence_only"
  on realtime.messages for insert
  to anon, authenticated
  with check (
    realtime.messages.extension = 'presence'
    and (select realtime.topic()) ~ '^live-chat:[0-9a-f-]{36}:public$'
  );

drop policy if exists "live_chat_presence_read" on realtime.messages;
create policy "live_chat_presence_read"
  on realtime.messages for select
  to anon, authenticated
  using (
    realtime.messages.extension = 'presence'
    and (select realtime.topic()) ~ '^live-chat:[0-9a-f-]{36}:public$'
  );

-- ── Retention ───────────────────────────────────────────────────────────────
-- Seven days, then gone. Long enough that a safeguarding concern raised the
-- following Sunday can still be looked into; short enough that we aren't sitting
-- on an indefinite pile of people's messages. Called by
-- app/api/cron/live-chat-purge.

create or replace function public.live_chat_purge(retain_days integer default 7)
returns table (messages_deleted bigint, prayers_deleted bigint, sessions_deleted bigint)
security definer
set search_path = ''
language plpgsql
as $$
declare
  cutoff timestamptz := now() - make_interval(days => retain_days);
  m bigint;
  p bigint;
  s bigint;
begin
  with gone as (
    delete from public.live_chat_messages where created_at < cutoff returning 1
  )
  select count(*) into m from gone;

  with gone as (
    delete from public.live_chat_prayer_requests where created_at < cutoff returning 1
  )
  select count(*) into p from gone;

  -- Only closed rooms, so an unusually long service can't have its own session
  -- pulled out from under it.
  with gone as (
    delete from public.live_chat_sessions
    where created_at < cutoff and state = 'closed'
    returning 1
  )
  select count(*) into s from gone;

  delete from public.live_chat_blocks
  where expires_at is not null and expires_at < now();

  return query select m, p, s;
end;
$$;

comment on function public.live_chat_purge(integer) is
  'Deletes live chat messages, prayer requests and closed sessions older than retain_days (default 7). Called on a schedule by app/api/cron/live-chat-purge.';
