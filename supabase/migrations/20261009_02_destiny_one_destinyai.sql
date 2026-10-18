-- Destiny One v0.10 — DestinyAI.
--
-- DestinyAI is the church's Smart Search, inside Destiny One. Two ways in:
--
--   • A one-to-one chat with it (the only one-to-one chat in Destiny One).
--     It is an ordinary d1_groups row of kind 'assistant' with exactly two
--     members, its owner and DestinyAI, so it gets the chat screen, encryption
--     at rest, Realtime, push, read state and reporting for free. It sits
--     outside every community (community_id is null).
--   • "@DestinyAI" in a group. DestinyAI is NOT a member of any group and
--     can't read one. The API hands it the asking message, plus the message
--     it replies to (and that one's reply chain), and nothing else. Its answer
--     is posted as a reply to the asking message.
--
-- DestinyAI is one d1_members row (is_assistant), active so it can be a
-- message sender, with a fixed id the app knows (DESTINY_AI_ID in
-- @destiny/shared). It never signs in: no auth user, no ChurchSuite record.
--
-- Additive for the running API: nothing here changes what an existing call
-- does for people, so it can be applied before the deploy.

-- ── 1. DestinyAI's member row ───────────────────────────────────────────────

alter table public.d1_members
  add column if not exists is_assistant boolean not null default false;

create unique index if not exists d1_members_one_assistant
  on public.d1_members (is_assistant) where is_assistant;

comment on column public.d1_members.is_assistant is
  'The DestinyAI row. Never shown in the directory or the admin members list.';

insert into public.d1_members (id, display_name, first_name, status, verified_at, verification_source, read_receipts, is_assistant)
values ('d1a1d1a1-0000-4000-8000-000000000001', 'DestinyAI', 'DestinyAI', 'active', now(), 'admin', true, true)
on conflict (id) do nothing;

-- ── 2. The 'assistant' chat kind ────────────────────────────────────────────

alter table public.d1_groups drop constraint if exists d1_groups_kind_check;
alter table public.d1_groups
  add constraint d1_groups_kind_check check (kind in ('announcements', 'group', 'assistant'));

alter table public.d1_groups alter column community_id drop not null;

alter table public.d1_groups
  add column if not exists owner_id uuid references public.d1_members (id) on delete cascade;

alter table public.d1_groups drop constraint if exists d1_groups_assistant_shape;
alter table public.d1_groups
  add constraint d1_groups_assistant_shape check (
    case when kind = 'assistant'
      then community_id is null and owner_id is not null
      else community_id is not null and owner_id is null
    end
  );

create unique index if not exists d1_groups_one_assistant_chat
  on public.d1_groups (owner_id) where kind = 'assistant';

-- ── 3. Group rules that don't apply to a chat with DestinyAI ────────────────

-- The 3-members / 2-adults rule is about people keeping each other safe in a
-- group. A chat with DestinyAI has one person in it, so it is never frozen
-- for that. (A safeguarding admin can still freeze it manually.)
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
  if g.kind = 'assistant' then
    return g.state;
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

-- Nobody manages a chat with DestinyAI, not even senior leaders: nobody can
-- add people to it, rename it or read it by joining it.
create or replace function public.d1_can_manage_group(p_group uuid, p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.d1_groups where id = p_group and kind = 'assistant')
    and (
      public.d1_is_senior(p_member)
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
      )
    );
$$;

-- Joining: a chat with DestinyAI only ever holds its owner and DestinyAI.
-- Every other group still needs community membership first.
create or replace function public.d1_group_members_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.d1_members%rowtype;
  g public.d1_groups%rowtype;
begin
  select * into m from public.d1_members where id = new.member_id;
  select * into g from public.d1_groups where id = new.group_id;

  -- Joining (or rejoining) needs an active, verified account.
  if new.left_at is null and (tg_op = 'INSERT' or old.left_at is not null) then
    if m.status is distinct from 'active' then
      raise exception 'Only active members can join a group.' using errcode = 'P0001';
    end if;
    if g.kind = 'assistant' then
      if new.member_id is distinct from g.owner_id and not m.is_assistant then
        raise exception 'Nobody else can join a chat with DestinyAI.' using errcode = 'P0001';
      end if;
    else
      if m.is_assistant then
        raise exception 'DestinyAI can''t join groups.' using errcode = 'P0001';
      end if;
      if not exists (
        select 1 from public.d1_community_members cm
        where cm.community_id = g.community_id and cm.member_id = new.member_id
      ) then
        raise exception 'Members must belong to the community before joining one of its groups.'
          using errcode = 'P0001';
      end if;
    end if;
  end if;

  -- Group admins moderate the group, so they must be verified adults.
  if new.role = 'admin' and new.left_at is null and not public.d1_is_adult(new.member_id) then
    raise exception 'Group admins must be verified adults.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- Posting: DestinyAI may answer in a group it isn't a member of (it was
-- @mentioned there), but only into an active group and only as a reply. The
-- API is the only thing that can post as DestinyAI (d1_post_assistant_message
-- is service_role only).
create or replace function public.d1_messages_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.d1_groups%rowtype;
  sender_role text;
  from_assistant boolean;
begin
  select * into g from public.d1_groups where id = new.group_id;

  if g.state is distinct from 'active' then
    raise exception 'This group is frozen and read-only.' using errcode = 'P0001';
  end if;

  select coalesce(m.is_assistant, false) into from_assistant
    from public.d1_members m where m.id = new.sender_id;
  from_assistant := coalesce(from_assistant, false);

  if from_assistant then
    if new.attachment_id is not null then
      raise exception 'DestinyAI can''t send attachments.' using errcode = 'P0001';
    end if;
    if g.kind <> 'assistant' and new.reply_to is null then
      raise exception 'DestinyAI only answers in a group when it is asked.' using errcode = 'P0001';
    end if;
  else
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
  end if;

  if new.reply_to is not null and not exists (
    select 1 from public.d1_messages r where r.id = new.reply_to and r.group_id = new.group_id
  ) then
    raise exception 'Replies must be to a message in the same group.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- ── 4. Opening the chat, and DestinyAI's answers ────────────────────────────

-- The caller's chat with DestinyAI, made the first time they open it. Also
-- puts them back in it if they had left it.
create or replace function public.d1_assistant_group(p_member uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
  bot uuid;
begin
  if not exists (select 1 from public.d1_members where id = p_member and status = 'active' and not is_assistant) then
    raise exception 'Only active members can chat with DestinyAI.' using errcode = 'P0001';
  end if;
  select id into bot from public.d1_members where is_assistant;
  if bot is null then
    raise exception 'DestinyAI isn''t set up.' using errcode = 'P0002';
  end if;

  select id into gid from public.d1_groups where kind = 'assistant' and owner_id = p_member;
  if gid is null then
    insert into public.d1_groups (kind, name, owner_id, created_by)
      values ('assistant', 'DestinyAI', p_member, p_member)
      on conflict (owner_id) where kind = 'assistant' do nothing
      returning id into gid;
    if gid is null then -- opened twice at once; the other call made it
      select id into gid from public.d1_groups where kind = 'assistant' and owner_id = p_member;
    end if;
  end if;

  insert into public.d1_group_members (group_id, member_id, role, added_by)
    values (gid, p_member, 'member', p_member), (gid, bot, 'member', p_member)
    on conflict (group_id, member_id) do update
      set left_at = null,
          joined_at = case when public.d1_group_members.left_at is null
                           then public.d1_group_members.joined_at else now() end
      where public.d1_group_members.left_at is not null;

  return gid;
end;
$$;

-- One answer from DestinyAI. Text is sealed by the API, like every message.
create or replace function public.d1_post_assistant_message(
  p_group uuid,
  p_body text,
  p_reply_to bigint default null,
  p_content jsonb default null,
  p_terms text[] default null,
  p_mentions uuid[] default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  bot uuid;
  mid bigint;
begin
  select id into bot from public.d1_members where is_assistant;

  insert into public.d1_messages (group_id, sender_id, body, reply_to, content, mentions)
    values (p_group, bot, nullif(btrim(coalesce(p_body, '')), ''), p_reply_to, p_content,
            public.d1_valid_mentions(p_group, bot, p_mentions))
    returning id into mid;

  insert into public.d1_message_terms (group_id, term, message_id)
    select distinct p_group, t, mid from unnest(coalesce(p_terms, '{}')) t;

  -- In its own chats DestinyAI has read what it answered ("Seen").
  update public.d1_group_members set last_read_message_id = mid
    where group_id = p_group and member_id = bot;

  return mid;
end;
$$;

-- ── 5. Keep DestinyAI out of the admin lists ────────────────────────────────

create or replace function public.d1_admin_groups(p_community uuid default null)
returns table (
  id uuid, community_id uuid, kind text, name text, department text, description text, state text,
  freeze_kind text, frozen_reason text, created_at timestamptz, member_count integer, adult_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.community_id, g.kind, g.name, g.department, g.description, g.state,
         g.freeze_kind, g.frozen_reason, g.created_at, c.members, c.adults
  from public.d1_groups g
  cross join lateral public.d1_group_counts(g.id) c
  where g.kind <> 'assistant'
    and (p_community is null or g.community_id = p_community)
  order by g.kind, g.name;
$$;

create or replace function public.d1_admin_members(p_status text default null)
returns table (
  id uuid, display_name text, email text, status text, roles text[], adult_on date, declared_adult_on date,
  request_note text, request_submitted_at timestamptz, verified_at timestamptz, verification_source text,
  churchsuite_contact_id bigint, churchsuite_child_id bigint, created_at timestamptz,
  community_count integer, group_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.display_name,
         coalesce(u.email::text,
                  (select i.email from public.d1_invites i where i.member_id = m.id order by i.created_at desc limit 1)),
         m.status, m.roles, m.adult_on, m.declared_adult_on,
         m.request_note, m.request_submitted_at, m.verified_at, m.verification_source,
         m.churchsuite_contact_id, m.churchsuite_child_id, m.created_at,
         (select count(*)::integer from public.d1_community_members cm where cm.member_id = m.id),
         (select count(*)::integer from public.d1_group_members gm
            join public.d1_groups g on g.id = gm.group_id
            where gm.member_id = m.id and gm.left_at is null and g.kind = 'group')
  from public.d1_members m
  left join auth.users u on u.id = m.auth_user_id
  where m.status <> 'deleted'
    and not m.is_assistant
    and (p_status is null or m.status = p_status)
  order by m.created_at desc;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on function public.d1_assistant_group(uuid) from public, anon, authenticated;
grant execute on function public.d1_assistant_group(uuid) to service_role;
revoke all on function public.d1_post_assistant_message(uuid, text, bigint, jsonb, text[], uuid[]) from public, anon, authenticated;
grant execute on function public.d1_post_assistant_message(uuid, text, bigint, jsonb, text[], uuid[]) to service_role;
