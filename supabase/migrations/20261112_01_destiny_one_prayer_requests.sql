-- Destiny One: prayer requests (1.2).
--
-- A prayer request is a message whose content is {"kind":"prayer","prayer":
-- {"text": <sealed>}}. Being a message, it is sealed, reported, deleted and kept
-- (1 year) exactly like any other, and under-18s' requests follow the same rules
-- as their messages. Two things hang off it:
--
--   d1_prayer_requests  one row per request: whether (and when) its author marked
--                       it answered, with an optional short update (sealed).
--   d1_prayer_taps      who tapped "I prayed". One per member per request.
--
-- Both go with the message when the retention purge removes it (on delete
-- cascade). A prayer request can reveal health or other personal details
-- (special category data under UK GDPR), which is why the text is sealed and
-- these tables are closed to browser keys.
--
-- "I prayed" taps notify nobody. A member can opt in (off by default) to one
-- summary a day, "5 people prayed for you today": d1_members.prayer_summary and
-- d1_prayer_summary_due(), read by /api/cron/destiny-one-prayer-summary.

-- ── The request text is sealed, like poll wording ───────────────────────────
alter table public.d1_messages drop constraint if exists d1_messages_prayer_sealed;
alter table public.d1_messages add constraint d1_messages_prayer_sealed
  check (
    content is null
    or content->>'kind' is distinct from 'prayer'
    or coalesce(content #>> '{prayer,text}', '') like 'd1e:%'
  );

-- ── Tables ──────────────────────────────────────────────────────────────────
create table if not exists public.d1_prayer_requests (
  message_id bigint primary key references public.d1_messages (id) on delete cascade,
  group_id uuid not null references public.d1_groups (id) on delete cascade,
  member_id uuid references public.d1_members (id) on delete set null,
  answered_at timestamptz,
  answer_update text check (answer_update is null or answer_update like 'd1e:%'),
  created_at timestamptz not null default now()
);
create index if not exists d1_prayer_requests_group_idx on public.d1_prayer_requests (group_id, created_at desc);

create table if not exists public.d1_prayer_taps (
  message_id bigint not null references public.d1_prayer_requests (message_id) on delete cascade,
  member_id uuid not null references public.d1_members (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, member_id)
);
create index if not exists d1_prayer_taps_recent_idx on public.d1_prayer_taps (created_at);

alter table public.d1_prayer_requests enable row level security;
alter table public.d1_prayer_taps enable row level security;
drop policy if exists "service only" on public.d1_prayer_requests;
create policy "service only" on public.d1_prayer_requests using (false) with check (false);
drop policy if exists "service only" on public.d1_prayer_taps;
create policy "service only" on public.d1_prayer_taps using (false) with check (false);

alter table public.d1_members add column if not exists prayer_summary boolean not null default false;
comment on column public.d1_members.prayer_summary is
  'Opted in to one notification a day saying how many people prayed for their requests. Off by default.';

-- ── A prayer message gets its row, whichever way it was posted ──────────────
create or replace function public.d1_messages_track_prayer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.content ->> 'kind' = 'prayer' then
    insert into public.d1_prayer_requests (message_id, group_id, member_id)
      values (new.id, new.group_id, new.sender_id)
      on conflict (message_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists d1_messages_track_prayer on public.d1_messages;
create trigger d1_messages_track_prayer
  after insert on public.d1_messages
  for each row execute function public.d1_messages_track_prayer();

-- ── "I prayed" ──────────────────────────────────────────────────────────────
-- Returns the new count. Tells the group the count only (never who): names are
-- read on request by a current member, as with reactions.
create or replace function public.d1_pray(p_actor uuid, p_message bigint, p_on boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
  author uuid;
  n integer;
begin
  select m.group_id, m.sender_id into gid, author
    from public.d1_messages m
    join public.d1_prayer_requests p on p.message_id = m.id
   where m.id = p_message and m.deleted_at is null;
  if gid is null then
    raise exception 'That prayer request does not exist.' using errcode = 'P0002';
  end if;
  if not public.d1_is_current_member(gid, p_actor) then
    raise exception 'Only current members can do that.' using errcode = '42501';
  end if;

  if p_on then
    if author = p_actor then
      raise exception 'This is your own request.' using errcode = 'P0001';
    end if;
    if (select state from public.d1_groups where id = gid) <> 'active' then
      raise exception 'This group is frozen and read-only.' using errcode = 'P0001';
    end if;
    insert into public.d1_prayer_taps (message_id, member_id) values (p_message, p_actor) on conflict do nothing;
  else
    delete from public.d1_prayer_taps where message_id = p_message and member_id = p_actor;
  end if;

  select count(*) into n from public.d1_prayer_taps where message_id = p_message;
  perform public.d1_emit('d1-group:' || gid, 'prayer_tap', jsonb_build_object(
    'messageId', p_message, 'groupId', gid, 'count', n));
  return n;
end;
$$;

-- ── Answered ────────────────────────────────────────────────────────────────
-- Only the person who posted it, once. The update is sealed by the API, which
-- also tells the group (the opened text must not pass through d1_emit, which
-- stores what it sends). Returns the group id.
create or replace function public.d1_answer_prayer(p_actor uuid, p_message bigint, p_update text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.d1_prayer_requests%rowtype;
begin
  select pr.* into p
    from public.d1_prayer_requests pr
    join public.d1_messages m on m.id = pr.message_id
   where pr.message_id = p_message and m.deleted_at is null
     for update of pr;
  if not found then
    raise exception 'That prayer request does not exist.' using errcode = 'P0002';
  end if;
  if p.member_id is distinct from p_actor then
    raise exception 'Only the person who asked can mark it answered.' using errcode = '42501';
  end if;
  if not public.d1_is_current_member(p.group_id, p_actor) then
    raise exception 'Only current members can do that.' using errcode = '42501';
  end if;
  if (select state from public.d1_groups where id = p.group_id) <> 'active' then
    raise exception 'This group is frozen and read-only.' using errcode = 'P0001';
  end if;
  if p.answered_at is not null then
    raise exception 'This request is already marked answered.' using errcode = 'P0001';
  end if;

  update public.d1_prayer_requests
     set answered_at = now(), answer_update = nullif(btrim(coalesce(p_update, '')), '')
   where message_id = p_message;
  return p.group_id;
end;
$$;

-- ── The daily summary ───────────────────────────────────────────────────────
-- Who opted in, and how many people prayed for their requests in the last 24
-- hours. Only active members, only requests that are still there.
create or replace function public.d1_prayer_summary_due()
returns table (member_id uuid, people integer)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.member_id, count(distinct t.member_id)::integer
    from public.d1_prayer_taps t
    join public.d1_prayer_requests pr on pr.message_id = t.message_id
    join public.d1_messages m on m.id = pr.message_id and m.deleted_at is null
    join public.d1_members a on a.id = pr.member_id and a.status = 'active' and a.prayer_summary
   where t.created_at > now() - interval '24 hours'
   group by pr.member_id;
$$;

revoke all on function public.d1_messages_track_prayer() from public, anon, authenticated;
revoke all on function public.d1_pray(uuid, bigint, boolean) from public, anon, authenticated;
grant execute on function public.d1_pray(uuid, bigint, boolean) to service_role;
revoke all on function public.d1_answer_prayer(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.d1_answer_prayer(uuid, bigint, text) to service_role;
revoke all on function public.d1_prayer_summary_due() from public, anon, authenticated;
grant execute on function public.d1_prayer_summary_due() to service_role;
