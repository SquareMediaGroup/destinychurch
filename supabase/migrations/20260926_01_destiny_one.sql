-- Destiny One — members-only group messaging for the mobile app.
--
-- WhatsApp-Communities shape: a Community (e.g. "Destiny Church") holds an
-- announcements group every member is in, plus sub-groups for departments
-- (Worship, Kids, Media, ...). There are no 1:1 chats.
--
-- The safeguarding rules live HERE, in the database, not in the API or the app:
--
--   1. No 1:1 messaging for anyone. A group needs at least 3 current members.
--   2. Only group leaders / senior leadership create groups.
--   3. Every group needs at least 2 verified adults, at creation and always.
--      If a leave, removal, suspension or deletion breaks that, the group is
--      FROZEN (read-only) and a safeguarding event is raised. It unfreezes on
--      its own once the rule holds again. Leaving is never blocked — an adult
--      must always be able to walk away (docs/mobile-app-scope.md, D1).
--   4. Nothing is end-to-end encrypted, and "deleted" messages are soft-deleted
--      so they stay reviewable until the retention purge.
--   5. No phone numbers: there is no phone column anywhere, and a Supabase
--      Auth user with a phone on it can't be activated.
--
-- "Adult" is `adult_on <= current_date`, where adult_on is the 18th birthday
-- taken from ChurchSuite. The full date of birth is never stored (data
-- minimisation). No adult_on means minor — fail safe. Because the check is
-- against current_date, a member turning 18 flips with no job needing to run.
--
-- Same access model as live chat (20260817_live_chat.sql): every table is
-- deny-all, the app never touches Postgres directly. The API routes under
-- /api/app/v1/one call the d1_* functions below with the service key, and the
-- functions push events onto private Realtime Broadcast topics that only
-- current members can receive:
--
--   d1-group:<group uuid>     — messages, reactions, membership, freeze state
--   d1-member:<member uuid>   — "you were added to / removed from a group"

-- ── Members ─────────────────────────────────────────────────────────────────
-- Keyed by its own id rather than auth.users.id: when someone deletes their
-- account the auth user goes, but their messages stay (anonymised) until the
-- retention purge, and those messages need a sender row to point at.

create table if not exists public.d1_members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,

  -- Real name from ChurchSuite. Members cannot change it: no pseudonyms in a
  -- safeguarding context. Only identity sync writes it.
  display_name text not null,

  churchsuite_contact_id bigint unique,
  churchsuite_child_id bigint unique,
  churchsuite_user_id bigint unique,

  -- 18th birthday. Null = minor (or unknown, which is treated as minor).
  adult_on date,

  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended', 'deleted')),

  -- App roles. Safeguarding review is an admin role (admin_roles), not this.
  roles text[] not null default '{}'
    check (roles <@ array['group_leader', 'senior_leadership']::text[]),

  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint d1_members_display_name_len
    check (char_length(display_name) between 1 and 120)
);

create index if not exists d1_members_status_idx on public.d1_members (status);

comment on table public.d1_members is
  'Destiny One app members. No phone numbers, no full DOB — adult_on (18th birthday) only.';

-- ── Consents ────────────────────────────────────────────────────────────────
-- A record of which version of which notice someone accepted, and when. GDPR
-- needs us to be able to show this; the app shows the notices.

create table if not exists public.d1_consents (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.d1_members (id) on delete cascade,
  document text not null check (document in ('privacy', 'terms', 'chat_review_notice')),
  version text not null check (char_length(version) between 1 and 40),
  accepted_at timestamptz not null default now(),
  unique (member_id, document, version)
);

-- ── Communities ─────────────────────────────────────────────────────────────

create table if not exists public.d1_communities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(coalesce(description, '')) <= 500),
  created_by uuid references public.d1_members (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.d1_community_members (
  community_id uuid not null references public.d1_communities (id) on delete cascade,
  member_id uuid not null references public.d1_members (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (community_id, member_id)
);

create index if not exists d1_community_members_member_idx
  on public.d1_community_members (member_id);

-- ── Groups ──────────────────────────────────────────────────────────────────
-- kind = 'announcements': one per community, everyone in the community is in
-- it, only group admins can post. kind = 'group': a department sub-group.
--
-- freeze_kind separates the two ways a group can be frozen:
--   auto   — the membership rule broke; lifts itself when it holds again
--   manual — a safeguarding admin froze it; only they lift it

create table if not exists public.d1_groups (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.d1_communities (id) on delete cascade,
  kind text not null default 'group' check (kind in ('announcements', 'group')),
  name text not null check (char_length(name) between 1 and 80),
  department text check (char_length(coalesce(department, '')) <= 80),
  description text check (char_length(coalesce(description, '')) <= 500),
  state text not null default 'active' check (state in ('active', 'frozen', 'archived')),
  freeze_kind text check (freeze_kind in ('auto', 'manual')),
  frozen_reason text,
  frozen_at timestamptz,
  created_by uuid references public.d1_members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint d1_groups_freeze_consistent
    check ((state = 'frozen') = (freeze_kind is not null))
);

create unique index if not exists d1_groups_one_announcements
  on public.d1_groups (community_id)
  where kind = 'announcements';

create index if not exists d1_groups_community_idx on public.d1_groups (community_id);

-- A membership row is kept after someone leaves (left_at set) so the review
-- tool can answer "who was in this group on the day of the incident".
create table if not exists public.d1_group_members (
  group_id uuid not null references public.d1_groups (id) on delete cascade,
  member_id uuid not null references public.d1_members (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  added_by uuid references public.d1_members (id) on delete set null,
  last_read_message_id bigint,
  muted_until timestamptz,
  primary key (group_id, member_id)
);

create index if not exists d1_group_members_member_idx
  on public.d1_group_members (member_id)
  where left_at is null;

-- ── Attachments ─────────────────────────────────────────────────────────────
-- Files live in the private d1-chat-media bucket at <group id>/<attachment id>.
-- The row is created when the upload URL is handed out; a message can only
-- reference an attachment its sender uploaded to the same group.

create table if not exists public.d1_attachments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.d1_groups (id) on delete cascade,
  uploader_id uuid references public.d1_members (id) on delete set null,
  storage_path text not null unique,
  mime_type text not null
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf')),
  size_bytes integer check (size_bytes is null or size_bytes between 1 and 20971520),
  created_at timestamptz not null default now()
);

-- ── Messages ────────────────────────────────────────────────────────────────
-- Deleting a message sets deleted_at; the body stays for the safeguarding
-- review window (docs/mobile-app-scope.md §4.3) and is hidden from members by
-- the API. d1_purge_expired() is what actually removes it.

create table if not exists public.d1_messages (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.d1_groups (id) on delete cascade,
  sender_id uuid references public.d1_members (id) on delete set null,
  body text check (char_length(coalesce(body, '')) <= 4000),
  reply_to bigint references public.d1_messages (id) on delete set null,
  attachment_id uuid references public.d1_attachments (id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.d1_members (id) on delete set null,
  constraint d1_messages_has_content
    check (char_length(btrim(coalesce(body, ''))) > 0 or attachment_id is not null)
);

create index if not exists d1_messages_group_idx on public.d1_messages (group_id, id desc);
create index if not exists d1_messages_sender_idx on public.d1_messages (sender_id);
create index if not exists d1_messages_created_idx on public.d1_messages (created_at);

create table if not exists public.d1_reactions (
  message_id bigint not null references public.d1_messages (id) on delete cascade,
  member_id uuid not null references public.d1_members (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, member_id, emoji)
);

-- ── Reports & safeguarding events ───────────────────────────────────────────

create table if not exists public.d1_reports (
  id bigint generated always as identity primary key,
  message_id bigint references public.d1_messages (id) on delete set null,
  group_id uuid not null references public.d1_groups (id) on delete cascade,
  reporter_id uuid references public.d1_members (id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'closed')),
  resolution text check (char_length(coalesce(resolution, '')) <= 2000),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists d1_reports_status_idx on public.d1_reports (status, created_at desc);

create table if not exists public.d1_safeguarding_events (
  id bigint generated always as identity primary key,
  group_id uuid references public.d1_groups (id) on delete cascade,
  kind text not null check (kind in ('frozen', 'unfrozen', 'report', 'manual_freeze', 'manual_unfreeze')),
  detail text not null,
  adult_count integer,
  member_count integer,
  report_id bigint references public.d1_reports (id) on delete set null,
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists d1_safeguarding_events_open_idx
  on public.d1_safeguarding_events (created_at desc)
  where resolved_at is null;

-- ── Push tokens ─────────────────────────────────────────────────────────────

create table if not exists public.d1_push_tokens (
  token text primary key check (char_length(token) between 10 and 300),
  member_id uuid not null references public.d1_members (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists d1_push_tokens_member_idx on public.d1_push_tokens (member_id);

-- ── Deny-all RLS ────────────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'd1_members', 'd1_consents', 'd1_communities', 'd1_community_members',
    'd1_groups', 'd1_group_members', 'd1_attachments', 'd1_messages',
    'd1_reactions', 'd1_reports', 'd1_safeguarding_events', 'd1_push_tokens'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "service only" on public.%I', t);
    execute format('create policy "service only" on public.%I using (false) with check (false)', t);
  end loop;
end;
$$;

-- ── Media bucket ────────────────────────────────────────────────────────────
-- Private: every read goes through a short-lived signed URL the API mints for
-- a current group member.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'd1-chat-media',
  'd1-chat-media',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ════════════════════════════════════════════════════════════════════════════
-- Helpers
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.d1_is_adult(p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select m.adult_on is not null and m.adult_on <= current_date
       from public.d1_members m where m.id = p_member),
    false
  );
$$;

comment on function public.d1_is_adult(uuid) is
  'Verified 18+ today. No adult_on on record counts as a minor.';

create or replace function public.d1_emit(topic text, event text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(payload, event, topic, true);
end;
$$;

comment on function public.d1_emit(text, text, jsonb) is
  'Pushes one Destiny One event onto a private Realtime topic (d1-group:<id> or d1-member:<id>).';

-- Current member of a group, and currently allowed to take part.
create or replace function public.d1_is_current_member(p_group uuid, p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.d1_group_members gm
    join public.d1_members m on m.id = gm.member_id
    where gm.group_id = p_group
      and gm.member_id = p_member
      and gm.left_at is null
      and m.status = 'active'
  );
$$;

create or replace function public.d1_group_counts(p_group uuid, out members integer, out adults integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*)::integer,
    count(*) filter (where m.adult_on is not null and m.adult_on <= current_date)::integer
  from public.d1_group_members gm
  join public.d1_members m on m.id = gm.member_id
  where gm.group_id = p_group
    and gm.left_at is null
    and m.status = 'active';
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Rule 1 + 3: the group invariant
-- ════════════════════════════════════════════════════════════════════════════
-- Recomputes one group and freezes or unfreezes it. Called by the deferred
-- membership trigger, by the member-status trigger, and nightly by
-- d1_reconcile_all() as defence in depth.

create or replace function public.d1_evaluate_group(p_group uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.d1_groups%rowtype;
  c record;
  ok boolean;
  reason text;
begin
  select * into g from public.d1_groups where id = p_group for update;
  if not found or g.state = 'archived' then
    return coalesce(g.state, 'missing');
  end if;

  select * into c from public.d1_group_counts(p_group);
  ok := c.members >= 3 and c.adults >= 2;

  if not ok then
    reason := case
      when c.adults < 2 and c.members < 3 then
        format('Needs at least 3 members including 2 verified adults (has %s members, %s adults).', c.members, c.adults)
      when c.adults < 2 then
        format('Needs at least 2 verified adults (has %s).', c.adults)
      else
        format('Needs at least 3 members (has %s).', c.members)
    end;
  end if;

  if not ok and g.state = 'active' then
    update public.d1_groups
      set state = 'frozen', freeze_kind = 'auto', frozen_reason = reason,
          frozen_at = now(), updated_at = now()
      where id = p_group;
    insert into public.d1_safeguarding_events (group_id, kind, detail, adult_count, member_count)
      values (p_group, 'frozen', reason, c.adults, c.members);
    perform public.d1_emit('d1-group:' || p_group, 'group_state',
      jsonb_build_object('groupId', p_group, 'state', 'frozen', 'reason', reason));
    return 'frozen';
  end if;

  if ok and g.state = 'frozen' and g.freeze_kind = 'auto' then
    update public.d1_groups
      set state = 'active', freeze_kind = null, frozen_reason = null,
          frozen_at = null, updated_at = now()
      where id = p_group;
    -- Only worth a safeguarding event if the freeze itself raised one: an
    -- announcements group that has simply never had enough people in it
    -- doesn't need to tell anybody when it first becomes usable.
    if exists (select 1 from public.d1_safeguarding_events
               where group_id = p_group and kind = 'frozen') then
      insert into public.d1_safeguarding_events (group_id, kind, detail, adult_count, member_count)
        values (p_group, 'unfrozen', 'Membership rule satisfied again.', c.adults, c.members);
    end if;
    perform public.d1_emit('d1-group:' || p_group, 'group_state',
      jsonb_build_object('groupId', p_group, 'state', 'active', 'reason', null));
    return 'active';
  end if;

  return g.state;
end;
$$;

-- Membership rows: deferred to commit, so a function that adds three people in
-- one go is judged on the result, not on the first insert.
create or replace function public.d1_group_members_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.d1_evaluate_group(coalesce(new.group_id, old.group_id));
  return null;
end;
$$;

drop trigger if exists d1_group_members_evaluate on public.d1_group_members;
create constraint trigger d1_group_members_evaluate
  after insert or update or delete on public.d1_group_members
  deferrable initially deferred
  for each row execute function public.d1_group_members_changed();

-- Guard rails on the membership row itself.
create or replace function public.d1_group_members_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.d1_members%rowtype;
begin
  select * into m from public.d1_members where id = new.member_id;

  -- Joining (or rejoining) needs an active, verified account.
  if new.left_at is null and (tg_op = 'INSERT' or old.left_at is not null) then
    if m.status is distinct from 'active' then
      raise exception 'Only active members can join a group.' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from public.d1_community_members cm
      join public.d1_groups g on g.community_id = cm.community_id
      where g.id = new.group_id and cm.member_id = new.member_id
    ) then
      raise exception 'Members must belong to the community before joining one of its groups.'
        using errcode = 'P0001';
    end if;
  end if;

  -- Group admins moderate the group, so they must be verified adults.
  if new.role = 'admin' and new.left_at is null and not public.d1_is_adult(new.member_id) then
    raise exception 'Group admins must be verified adults.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists d1_group_members_guard on public.d1_group_members;
create trigger d1_group_members_guard
  before insert or update on public.d1_group_members
  for each row execute function public.d1_group_members_guard();

-- Member rows: roles, activation, and status changes that affect groups.
create or replace function public.d1_members_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  has_phone boolean;
begin
  new.updated_at := now();

  if cardinality(new.roles) > 0 and not (new.adult_on is not null and new.adult_on <= current_date) then
    raise exception 'Leader roles can only be held by verified adults.' using errcode = 'P0001';
  end if;

  -- Rule 5. The phone provider is meant to be switched off in Supabase Auth;
  -- this is the backstop if it ever isn't.
  if new.status = 'active' and new.auth_user_id is not null then
    select (u.phone is not null and u.phone <> '') into has_phone
      from auth.users u where u.id = new.auth_user_id;
    if coalesce(has_phone, false) then
      raise exception 'Accounts with a phone number cannot be activated.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists d1_members_guard on public.d1_members;
create trigger d1_members_guard
  before insert or update on public.d1_members
  for each row execute function public.d1_members_guard();

create or replace function public.d1_members_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  if new.status is distinct from old.status or new.adult_on is distinct from old.adult_on then
    for gid in
      select group_id from public.d1_group_members
      where member_id = new.id and left_at is null
    loop
      perform public.d1_evaluate_group(gid);
    end loop;
  end if;
  return null;
end;
$$;

drop trigger if exists d1_members_changed on public.d1_members;
create constraint trigger d1_members_changed
  after update on public.d1_members
  deferrable initially deferred
  for each row execute function public.d1_members_changed();

-- ── Message guard ───────────────────────────────────────────────────────────

create or replace function public.d1_messages_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.d1_groups%rowtype;
  sender_role text;
begin
  select * into g from public.d1_groups where id = new.group_id;

  if g.state is distinct from 'active' then
    raise exception 'This group is frozen and read-only.' using errcode = 'P0001';
  end if;

  if not public.d1_is_current_member(new.group_id, new.sender_id) then
    raise exception 'Only current, active members can post in this group.' using errcode = 'P0001';
  end if;

  if g.kind = 'announcements' then
    select role into sender_role from public.d1_group_members
      where group_id = new.group_id and member_id = new.sender_id;
    if sender_role is distinct from 'admin' then
      raise exception 'Only admins can post announcements.' using errcode = 'P0001';
    end if;
  end if;

  if new.attachment_id is not null and not exists (
    select 1 from public.d1_attachments a
    where a.id = new.attachment_id and a.group_id = new.group_id and a.uploader_id = new.sender_id
  ) then
    raise exception 'Attachment does not belong to this group.' using errcode = 'P0001';
  end if;

  if new.reply_to is not null and not exists (
    select 1 from public.d1_messages r where r.id = new.reply_to and r.group_id = new.group_id
  ) then
    raise exception 'Replies must be to a message in the same group.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists d1_messages_guard on public.d1_messages;
create trigger d1_messages_guard
  before insert on public.d1_messages
  for each row execute function public.d1_messages_guard();

-- Messages are never edited in place: the review trail has to show what was
-- actually sent. The only permitted change is the soft-delete stamp.
create or replace function public.d1_messages_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.body is distinct from old.body
     or new.group_id is distinct from old.group_id
     or new.attachment_id is distinct from old.attachment_id
     or new.reply_to is distinct from old.reply_to
     or new.created_at is distinct from old.created_at
     or (new.sender_id is distinct from old.sender_id and new.sender_id is not null) then
    raise exception 'Messages cannot be edited.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists d1_messages_immutable on public.d1_messages;
create trigger d1_messages_immutable
  before update on public.d1_messages
  for each row execute function public.d1_messages_immutable();

-- ── Safeguarding events reach the admin bell ────────────────────────────────
-- Written straight into the existing notifications table (20260922_02) for the
-- safeguarding_admin role, and broadcast the same way lib/notify.server.ts
-- does, so the alert can't be lost between a SQL write and an API follow-up.

create or replace function public.d1_safeguarding_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  gname text;
  summary text;
  nid bigint;
  created timestamptz;
  payload jsonb;
begin
  -- An unfreeze is good news; it goes in the log but doesn't ring the bell.
  if new.kind = 'unfrozen' then
    return null;
  end if;

  select name into gname from public.d1_groups where id = new.group_id;
  summary := case new.kind
    when 'frozen' then format('Destiny One group "%s" was frozen: %s', coalesce(gname, '?'), new.detail)
    when 'report' then format('A message was reported in Destiny One group "%s"', coalesce(gname, '?'))
    else format('Destiny One group "%s": %s', coalesce(gname, '?'), new.detail)
  end;

  insert into public.notifications (section, kind, entity_id, entity_label, summary, href, roles, metadata)
    values ('safeguarding', 'd1_' || new.kind, new.id::text, gname, left(summary, 500),
            '/admin/safeguarding?event=' || new.id, array['safeguarding_admin'],
            jsonb_build_object('groupId', new.group_id))
    returning id, created_at into nid, created;

  payload := jsonb_build_object(
    'id', nid, 'createdAt', created, 'section', 'safeguarding', 'kind', 'd1_' || new.kind,
    'entityId', new.id::text, 'entityLabel', gname, 'summary', left(summary, 500),
    'href', '/admin/safeguarding?event=' || new.id, 'roles', jsonb_build_array('safeguarding_admin'));

  perform realtime.send(payload, 'notification', 'admin-notifications:safeguarding_admin', true);
  perform realtime.send(payload, 'notification', 'admin-notifications:super_admin', true);
  return null;
end;
$$;

drop trigger if exists d1_safeguarding_notify on public.d1_safeguarding_events;
create trigger d1_safeguarding_notify
  after insert on public.d1_safeguarding_events
  for each row execute function public.d1_safeguarding_notify();

-- ════════════════════════════════════════════════════════════════════════════
-- Operations (called by the API with the service key)
-- ════════════════════════════════════════════════════════════════════════════
-- Each takes the acting member explicitly: the API has already resolved it from
-- the caller's access token. Permission checks live here as well as in
-- lib/destinyOne/policy.ts so that a bug in a route can't widen access.

create or replace function public.d1_is_leader(p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.d1_members
    where id = p_member and status = 'active'
      and roles && array['group_leader', 'senior_leadership']::text[]
  );
$$;

create or replace function public.d1_is_senior(p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.d1_members
    where id = p_member and status = 'active' and 'senior_leadership' = any (roles)
  );
$$;

-- Can manage a group's membership: senior leadership, a community admin, or a
-- current admin of the group.
create or replace function public.d1_can_manage_group(p_group uuid, p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.d1_is_senior(p_member)
    or exists (
      select 1 from public.d1_community_members cm
      join public.d1_groups g on g.community_id = cm.community_id
      join public.d1_members m on m.id = cm.member_id
      where g.id = p_group and cm.member_id = p_member and cm.role = 'admin' and m.status = 'active'
    )
    or exists (
      select 1 from public.d1_group_members gm
      join public.d1_members m on m.id = gm.member_id
      where gm.group_id = p_group and gm.member_id = p_member
        and gm.role = 'admin' and gm.left_at is null and m.status = 'active'
    );
$$;

create or replace function public.d1_can_manage_community(p_community uuid, p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.d1_is_senior(p_member)
    or exists (
      select 1 from public.d1_community_members cm
      join public.d1_members m on m.id = cm.member_id
      where cm.community_id = p_community and cm.member_id = p_member
        and cm.role = 'admin' and m.status = 'active'
    );
$$;

-- Adds (or re-adds) people to a group. Shared by group creation, community
-- joins (announcements) and the "add members" endpoint.
create or replace function public.d1__join_group(p_group uuid, p_members uuid[], p_actor uuid, p_role text default 'member')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mid uuid;
begin
  foreach mid in array p_members loop
    insert into public.d1_group_members (group_id, member_id, role, added_by)
      values (p_group, mid, p_role, p_actor)
      on conflict (group_id, member_id) do update
        set left_at = null,
            joined_at = case when public.d1_group_members.left_at is null
                             then public.d1_group_members.joined_at else now() end,
            role = case when p_role = 'admin' then 'admin' else public.d1_group_members.role end,
            added_by = excluded.added_by;
    perform public.d1_emit('d1-member:' || mid, 'group_joined', jsonb_build_object('groupId', p_group));
  end loop;
  perform public.d1_emit('d1-group:' || p_group, 'members_changed', jsonb_build_object('groupId', p_group));
end;
$$;

-- Community + its announcements group. The announcements group starts frozen
-- (auto) until enough people have joined; no safeguarding event for that.
create or replace function public.d1_create_community(
  p_actor uuid,
  p_name text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid uuid;
  gid uuid;
begin
  if not public.d1_is_senior(p_actor) then
    raise exception 'Only senior leadership can create communities.' using errcode = '42501';
  end if;

  insert into public.d1_communities (name, description, created_by)
    values (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), p_actor)
    returning id into cid;

  insert into public.d1_community_members (community_id, member_id, role)
    values (cid, p_actor, 'admin');

  insert into public.d1_groups (community_id, kind, name, state, freeze_kind, frozen_reason, frozen_at, created_by)
    values (cid, 'announcements', 'Announcements', 'frozen', 'auto',
            'Needs at least 3 members including 2 verified adults.', now(), p_actor)
    returning id into gid;

  perform public.d1__join_group(gid, array[p_actor], p_actor, 'admin');
  return cid;
end;
$$;

-- Adds people to a community, and so to its announcements group.
create or replace function public.d1_add_community_members(
  p_actor uuid,
  p_community uuid,
  p_members uuid[],
  p_role text default 'member'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
  mid uuid;
begin
  if not public.d1_can_manage_community(p_community, p_actor) then
    raise exception 'You cannot add people to this community.' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'member') then
    raise exception 'Unknown role.' using errcode = '22023';
  end if;

  foreach mid in array p_members loop
    if p_role = 'admin' and not public.d1_is_adult(mid) then
      raise exception 'Community admins must be verified adults.' using errcode = 'P0001';
    end if;
    insert into public.d1_community_members (community_id, member_id, role)
      values (p_community, mid, p_role)
      on conflict (community_id, member_id) do update
        set role = case when p_role = 'admin' then 'admin' else public.d1_community_members.role end;
  end loop;

  select id into gid from public.d1_groups where community_id = p_community and kind = 'announcements';
  perform public.d1__join_group(gid, p_members, p_actor, 'member');

  -- Community admins can post announcements.
  if p_role = 'admin' then
    update public.d1_group_members set role = 'admin'
      where group_id = gid and member_id = any (p_members);
  end if;
end;
$$;

-- Removes someone from a community and every group in it. Anyone may remove
-- themselves; managers may remove others.
create or replace function public.d1_remove_community_member(p_actor uuid, p_community uuid, p_member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  if p_actor <> p_member and not public.d1_can_manage_community(p_community, p_actor) then
    raise exception 'You cannot remove people from this community.' using errcode = '42501';
  end if;

  for gid in
    update public.d1_group_members gm set left_at = now()
      from public.d1_groups g
      where g.id = gm.group_id and g.community_id = p_community
        and gm.member_id = p_member and gm.left_at is null
      returning gm.group_id
  loop
    perform public.d1_emit('d1-group:' || gid, 'members_changed', jsonb_build_object('groupId', gid));
  end loop;

  delete from public.d1_community_members where community_id = p_community and member_id = p_member;
  perform public.d1_emit('d1-member:' || p_member, 'community_left', jsonb_build_object('communityId', p_community));
end;
$$;

-- Rule 1 + 2 + 3 at creation: leaders only, ≥3 people, ≥2 verified adults.
create or replace function public.d1_create_group(
  p_actor uuid,
  p_community uuid,
  p_name text,
  p_department text,
  p_description text,
  p_members uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
  everyone uuid[];
  total integer;
  adults integer;
begin
  if not public.d1_is_leader(p_actor) then
    raise exception 'Only group leaders and senior leadership can create groups.' using errcode = '42501';
  end if;
  if not public.d1_is_adult(p_actor) then
    raise exception 'Group creators must be verified adults.' using errcode = '42501';
  end if;
  -- Everyone in a group has to be in its community (d1_group_members_guard),
  -- and that includes the person creating it — senior leadership too.
  if not exists (
    select 1 from public.d1_community_members where community_id = p_community and member_id = p_actor
  ) then
    raise exception 'You are not in this community.' using errcode = '42501';
  end if;

  select array_agg(distinct x) into everyone
    from unnest(array_append(coalesce(p_members, '{}'), p_actor)) as x;

  select count(*), count(*) filter (where m.adult_on is not null and m.adult_on <= current_date)
    into total, adults
    from public.d1_members m
    where m.id = any (everyone) and m.status = 'active';

  if total <> cardinality(everyone) then
    raise exception 'Everyone in a group must have an active account.' using errcode = 'P0001';
  end if;
  if total < 3 then
    raise exception 'A group needs at least 3 people. There are no one-to-one chats.' using errcode = 'P0001';
  end if;
  if adults < 2 then
    raise exception 'A group needs at least 2 verified adults.' using errcode = 'P0001';
  end if;

  insert into public.d1_groups (community_id, kind, name, department, description, created_by)
    values (p_community, 'group', btrim(p_name),
            nullif(btrim(coalesce(p_department, '')), ''),
            nullif(btrim(coalesce(p_description, '')), ''), p_actor)
    returning id into gid;

  perform public.d1__join_group(gid, array[p_actor], p_actor, 'admin');
  perform public.d1__join_group(gid, array_remove(everyone, p_actor), p_actor, 'member');
  return gid;
end;
$$;

create or replace function public.d1_add_group_members(p_actor uuid, p_group uuid, p_members uuid[], p_role text default 'member')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  k text;
begin
  select kind into k from public.d1_groups where id = p_group and state <> 'archived';
  if k is null then
    raise exception 'Group not found.' using errcode = 'P0002';
  end if;
  if k = 'announcements' then
    raise exception 'Add people to the community to put them in its announcements.' using errcode = 'P0001';
  end if;
  if not public.d1_can_manage_group(p_group, p_actor) then
    raise exception 'You cannot add people to this group.' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'member') then
    raise exception 'Unknown role.' using errcode = '22023';
  end if;
  perform public.d1__join_group(p_group, p_members, p_actor, p_role);
end;
$$;

-- Leaving is never blocked. If it breaks the rule, the deferred trigger freezes
-- the group and raises the safeguarding event.
create or replace function public.d1_remove_group_member(p_actor uuid, p_group uuid, p_member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  k text;
begin
  select kind into k from public.d1_groups where id = p_group;
  if k is null then
    raise exception 'Group not found.' using errcode = 'P0002';
  end if;
  if k = 'announcements' then
    raise exception 'Leave the community to leave its announcements.' using errcode = 'P0001';
  end if;
  if p_actor <> p_member and not public.d1_can_manage_group(p_group, p_actor) then
    raise exception 'You cannot remove people from this group.' using errcode = '42501';
  end if;

  update public.d1_group_members set left_at = now()
    where group_id = p_group and member_id = p_member and left_at is null;

  perform public.d1_emit('d1-member:' || p_member, 'group_left', jsonb_build_object('groupId', p_group));
  perform public.d1_emit('d1-group:' || p_group, 'members_changed', jsonb_build_object('groupId', p_group));
end;
$$;

create or replace function public.d1_post_message(
  p_actor uuid,
  p_group uuid,
  p_body text,
  p_reply_to bigint default null,
  p_attachment uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  mid bigint;
  created timestamptz;
  sender_name text;
begin
  insert into public.d1_messages (group_id, sender_id, body, reply_to, attachment_id)
    values (p_group, p_actor, nullif(btrim(coalesce(p_body, '')), ''), p_reply_to, p_attachment)
    returning id, created_at into mid, created;

  select display_name into sender_name from public.d1_members where id = p_actor;

  update public.d1_group_members set last_read_message_id = mid
    where group_id = p_group and member_id = p_actor;

  perform public.d1_emit('d1-group:' || p_group, 'message', jsonb_build_object(
    'id', mid, 'groupId', p_group,
    'sender', jsonb_build_object('id', p_actor, 'displayName', sender_name),
    'body', nullif(btrim(coalesce(p_body, '')), ''),
    'replyTo', p_reply_to, 'attachmentId', p_attachment, 'createdAt', created));
  return mid;
end;
$$;

-- Soft delete by the sender or a group manager. Allowed on a frozen group:
-- taking something down should never be blocked.
create or replace function public.d1_delete_message(p_actor uuid, p_message bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  msg public.d1_messages%rowtype;
begin
  select * into msg from public.d1_messages where id = p_message;
  if not found or msg.deleted_at is not null then
    raise exception 'Message not found.' using errcode = 'P0002';
  end if;
  if msg.sender_id is distinct from p_actor and not public.d1_can_manage_group(msg.group_id, p_actor) then
    raise exception 'You cannot delete this message.' using errcode = '42501';
  end if;

  update public.d1_messages set deleted_at = now(), deleted_by = p_actor where id = p_message;
  perform public.d1_emit('d1-group:' || msg.group_id, 'message_deleted',
    jsonb_build_object('id', p_message, 'groupId', msg.group_id));
end;
$$;

create or replace function public.d1_react(p_actor uuid, p_message bigint, p_emoji text, p_add boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  select group_id into gid from public.d1_messages where id = p_message and deleted_at is null;
  if gid is null then
    raise exception 'Message not found.' using errcode = 'P0002';
  end if;
  if not public.d1_is_current_member(gid, p_actor) then
    raise exception 'Only current members can react.' using errcode = '42501';
  end if;
  if p_add and (select state from public.d1_groups where id = gid) <> 'active' then
    raise exception 'This group is frozen and read-only.' using errcode = 'P0001';
  end if;

  if p_add then
    insert into public.d1_reactions (message_id, member_id, emoji)
      values (p_message, p_actor, p_emoji) on conflict do nothing;
  else
    delete from public.d1_reactions where message_id = p_message and member_id = p_actor and emoji = p_emoji;
  end if;

  perform public.d1_emit('d1-group:' || gid, 'reaction', jsonb_build_object(
    'messageId', p_message, 'groupId', gid, 'memberId', p_actor, 'emoji', p_emoji, 'added', p_add));
end;
$$;

-- Any current member may report a message, even in a frozen group.
create or replace function public.d1_report_message(p_actor uuid, p_message bigint, p_reason text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
  rid bigint;
begin
  select group_id into gid from public.d1_messages where id = p_message;
  if gid is null then
    raise exception 'Message not found.' using errcode = 'P0002';
  end if;
  if not exists (
    select 1 from public.d1_group_members
    where group_id = gid and member_id = p_actor and left_at is null
  ) then
    raise exception 'Only members of the group can report its messages.' using errcode = '42501';
  end if;

  insert into public.d1_reports (message_id, group_id, reporter_id, reason)
    values (p_message, gid, p_actor, btrim(p_reason))
    returning id into rid;
  insert into public.d1_safeguarding_events (group_id, kind, detail, report_id)
    values (gid, 'report', 'A member reported a message.', rid);
  return rid;
end;
$$;

-- Safeguarding admin controls (called from /api/admin/destiny-one).
create or replace function public.d1_set_manual_freeze(p_group uuid, p_frozen boolean, p_reason text, p_admin uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_frozen then
    update public.d1_groups
      set state = 'frozen', freeze_kind = 'manual', frozen_reason = btrim(p_reason),
          frozen_at = now(), updated_at = now()
      where id = p_group and state <> 'archived';
    insert into public.d1_safeguarding_events (group_id, kind, detail, resolved_by, resolved_at)
      values (p_group, 'manual_freeze', btrim(p_reason), p_admin, now());
    perform public.d1_emit('d1-group:' || p_group, 'group_state',
      jsonb_build_object('groupId', p_group, 'state', 'frozen', 'reason', btrim(p_reason)));
    return 'frozen';
  end if;

  -- Lifting a manual freeze hands the group back to the automatic rule, which
  -- may immediately re-freeze it if membership doesn't satisfy it.
  update public.d1_groups
    set state = 'active', freeze_kind = null, frozen_reason = null, frozen_at = null, updated_at = now()
    where id = p_group and state = 'frozen' and freeze_kind = 'manual';
  insert into public.d1_safeguarding_events (group_id, kind, detail, resolved_by, resolved_at)
    values (p_group, 'manual_unfreeze', coalesce(nullif(btrim(p_reason), ''), 'Lifted by safeguarding.'), p_admin, now());
  perform public.d1_emit('d1-group:' || p_group, 'group_state',
    jsonb_build_object('groupId', p_group, 'state', 'active', 'reason', null));
  return public.d1_evaluate_group(p_group);
end;
$$;

-- ── Account deletion (GDPR erasure) ─────────────────────────────────────────
-- Leaves every group (the membership trigger freezes any that break the rule),
-- drops tokens/consents, anonymises the member row. Messages remain until the
-- retention purge because safeguarding review is the lawful basis for keeping
-- them — see docs/destiny-one-gdpr.md. The API deletes the auth user after.

create or replace function public.d1_erase_member(p_member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  for gid in
    update public.d1_group_members set left_at = now()
      where member_id = p_member and left_at is null
      returning group_id
  loop
    perform public.d1_emit('d1-group:' || gid, 'members_changed', jsonb_build_object('groupId', gid));
  end loop;

  delete from public.d1_community_members where member_id = p_member;
  delete from public.d1_push_tokens where member_id = p_member;
  delete from public.d1_reactions where member_id = p_member;

  update public.d1_members
    set status = 'deleted', display_name = 'Former member', roles = '{}',
        churchsuite_contact_id = null, churchsuite_child_id = null, churchsuite_user_id = null,
        adult_on = null, deleted_at = now()
    where id = p_member;
end;
$$;

-- ── Retention ───────────────────────────────────────────────────────────────
-- Removes messages (and their attachment rows) older than the retention
-- window, and member rows that were erased and no longer own any message.
-- Storage objects are removed by the cron route using the returned paths.

create or replace function public.d1_purge_expired(p_retain_days integer)
returns table (messages_deleted integer, attachment_paths text[], members_deleted integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  cutoff timestamptz := now() - make_interval(days => greatest(p_retain_days, 30));
  n_msgs integer;
  paths text[];
  n_members integer;
begin
  with gone as (
    delete from public.d1_messages where created_at < cutoff returning attachment_id
  )
  select count(*)::integer into n_msgs from gone;

  with gone as (
    delete from public.d1_attachments a
      where a.created_at < cutoff
        and not exists (select 1 from public.d1_messages m where m.attachment_id = a.id)
      returning storage_path
  )
  select coalesce(array_agg(storage_path), '{}') into paths from gone;

  with gone as (
    delete from public.d1_members mem
      where mem.status = 'deleted'
        and not exists (select 1 from public.d1_messages m where m.sender_id = mem.id)
      returning 1
  )
  select count(*)::integer into n_members from gone;

  delete from public.d1_safeguarding_events where created_at < cutoff and resolved_at is not null;
  delete from public.d1_reports where created_at < cutoff and status = 'closed';

  return query select n_msgs, paths, n_members;
end;
$$;

-- Nightly defence in depth: every live group re-checked.
create or replace function public.d1_reconcile_all()
returns table (group_id uuid, state text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  for gid in select g.id from public.d1_groups g where g.state <> 'archived' loop
    group_id := gid;
    state := public.d1_evaluate_group(gid);
    return next;
  end loop;
end;
$$;

-- ── Reads ───────────────────────────────────────────────────────────────────
-- The chat list: every group the member is currently in, newest activity
-- first, with unread count and a preview of the last message. One query for
-- the whole list rather than one per group. A deleted last message comes back
-- with a null body — its content is for safeguarding review only.

create or replace function public.d1_group_overview(p_member uuid, p_group uuid default null)
returns table (
  group_id uuid,
  community_id uuid,
  kind text,
  name text,
  department text,
  description text,
  state text,
  frozen_reason text,
  my_role text,
  joined_at timestamptz,
  muted_until timestamptz,
  unread_count integer,
  last_id bigint,
  last_sender text,
  last_body text,
  last_has_attachment boolean,
  last_deleted boolean,
  last_created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.id, g.community_id, g.kind, g.name, g.department, g.description, g.state, g.frozen_reason,
    gm.role, gm.joined_at, gm.muted_until,
    (select count(*)::integer from public.d1_messages m
       where m.group_id = g.id
         and m.id > coalesce(gm.last_read_message_id, 0)
         and m.created_at >= gm.joined_at
         and m.deleted_at is null
         and m.sender_id is distinct from p_member),
    lm.id, s.display_name,
    case when lm.deleted_at is null then lm.body end,
    lm.attachment_id is not null, lm.deleted_at is not null, lm.created_at
  from public.d1_group_members gm
  join public.d1_groups g on g.id = gm.group_id
  left join lateral (
    select m.* from public.d1_messages m
    where m.group_id = g.id and m.created_at >= gm.joined_at
    order by m.id desc limit 1
  ) lm on true
  left join public.d1_members s on s.id = lm.sender_id
  where gm.member_id = p_member
    and gm.left_at is null
    and g.state <> 'archived'
    and (p_group is null or g.id = p_group)
  order by coalesce(lm.created_at, g.created_at) desc;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Realtime authorisation
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.d1_current_member_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.d1_members
  where auth_user_id = (select auth.uid()) and status = 'active';
$$;

create or replace function public.d1_can_receive(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := public.d1_current_member_id();
begin
  if me is null then
    return false;
  end if;
  if p_topic ~ '^d1-group:[0-9a-f-]{36}$' then
    return exists (
      select 1 from public.d1_group_members
      where group_id = substring(p_topic from 10)::uuid
        and member_id = me and left_at is null
    );
  end if;
  if p_topic ~ '^d1-member:[0-9a-f-]{36}$' then
    return substring(p_topic from 11)::uuid = me;
  end if;
  return false;
end;
$$;

drop policy if exists "d1_receive" on realtime.messages;
create policy "d1_receive"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) ~ '^d1-(group|member):[0-9a-f-]{36}$'
    and (select public.d1_can_receive((select realtime.topic())))
  );

-- No insert policy: the app never broadcasts; only d1_emit() does.

-- ── Grants ──────────────────────────────────────────────────────────────────
-- Postgres grants EXECUTE to PUBLIC by default. Every function here takes the
-- acting member as an argument and trusts it, so none of them may be callable
-- with the anon key or a user's JWT — only the two the Realtime policy needs.

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'd1\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end;
$$;

grant execute on function public.d1_current_member_id() to authenticated;
grant execute on function public.d1_can_receive(text) to authenticated;

-- ── Safeguarding admin role ─────────────────────────────────────────────────
-- Reviews Destiny One reports, frozen groups and (audited) transcripts.
-- lib/adminRoles.ts getRoles and lib/staffLogins.ts spell their column lists
-- out, so the column is added there by hand too.

alter table public.admin_roles
  add column if not exists safeguarding_admin boolean not null default false;

comment on column public.admin_roles.safeguarding_admin is
  'Can reach /api/admin/destiny-one — Destiny One reports, frozen groups and audited transcript review.';

create or replace function public.admin_has_role(p_role text)
returns boolean
security definer
set search_path = ''
language sql
stable
as $$
  select coalesce(
    (
      select
        case p_role
          when 'training_admin'     then r.training_admin
          when 'event_admin'        then r.event_admin
          when 'store_admin'        then r.store_admin
          when 'site_admin'         then r.site_admin
          when 'host'               then r.host
          when 'hr_admin'           then r.hr_admin
          when 'design_admin'       then r.design_admin
          when 'sermon_admin'       then r.sermon_admin
          when 'safeguarding_admin' then r.safeguarding_admin
          when 'super_admin'        then r.super_admin
          else false
        end
        or r.super_admin
      from public.admin_roles r
      where r.auth_user_id = (select auth.uid())
    ),
    false
  );
$$;
