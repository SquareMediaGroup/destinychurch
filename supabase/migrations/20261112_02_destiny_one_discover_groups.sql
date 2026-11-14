-- Destiny One: Discover groups (1.3).
--
-- Members can browse small groups that are open to new people and ask to join;
-- a leader approves. The app itself stays invite-only: Discover only ever shows
-- groups in communities the member already belongs to.
--
-- The rules live HERE, in the database, like the rest of the safeguarding rules:
--
--   * A leader opens a group ("Show in Discover") and describes it. Only ordinary
--     groups that are active: never Announcements, never DestinyAI chats.
--   * An under-18 can only see, ask to join, or be approved into a group that a
--     SAFEGUARDING ADMIN has marked "Suitable for under-18s" (u18_suitable). A
--     leader cannot set that flag. d1_can_discover() is the one test, used by the
--     list, by asking, and again at approval, so the app cannot get round it.
--   * A member can have 3 requests waiting at a time. A declined request cannot
--     be sent again for 30 days.
--   * Approval adds the member the normal way (d1__join_group), so the 2-adult
--     rule and its automatic pause still apply.
--
-- The optional note with a request is sealed by the API, like a message.

alter table public.d1_groups add column if not exists discoverable boolean not null default false;
alter table public.d1_groups add column if not exists discover_blurb text check (char_length(coalesce(discover_blurb, '')) <= 140);
alter table public.d1_groups add column if not exists meeting_day smallint check (meeting_day between 1 and 7);
alter table public.d1_groups add column if not exists meeting_area text check (char_length(coalesce(meeting_area, '')) <= 60);
alter table public.d1_groups add column if not exists u18_suitable boolean not null default false;
alter table public.d1_groups add column if not exists u18_marked_by uuid;
alter table public.d1_groups add column if not exists u18_marked_at timestamptz;

comment on column public.d1_groups.discoverable is 'Shown in Discover groups to members of its community (set by a group manager).';
comment on column public.d1_groups.meeting_day is '1 = Monday ... 7 = Sunday. Null when it varies.';
comment on column public.d1_groups.u18_suitable is
  'A safeguarding admin has marked the group suitable for under-18s. Only then can an under-18 see it in Discover, ask to join, or be approved.';
comment on column public.d1_groups.u18_marked_by is 'The admin (auth user id) who last set u18_suitable.';

create table if not exists public.d1_join_requests (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.d1_groups (id) on delete cascade,
  member_id uuid not null references public.d1_members (id) on delete cascade,
  note text check (note is null or note like 'd1e:%'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'withdrawn')),
  decided_by uuid references public.d1_members (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists d1_join_requests_one_pending on public.d1_join_requests (group_id, member_id) where status = 'pending';
create index if not exists d1_join_requests_member_idx on public.d1_join_requests (member_id, status);
create index if not exists d1_join_requests_group_idx on public.d1_join_requests (group_id, status);

alter table public.d1_join_requests enable row level security;
drop policy if exists "service only" on public.d1_join_requests;
create policy "service only" on public.d1_join_requests using (false) with check (false);

-- ── The one test: may this member see (and ask to join) this group? ─────────
create or replace function public.d1_can_discover(p_member uuid, p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.d1_groups g
      join public.d1_members m on m.id = p_member and m.status = 'active'
      join public.d1_community_members cm on cm.community_id = g.community_id and cm.member_id = p_member
     where g.id = p_group
       and g.kind = 'group'
       and g.state = 'active'
       and g.discoverable
       and (g.u18_suitable or (m.adult_on is not null and m.adult_on <= current_date))
  );
$$;

-- ── Opening a group ─────────────────────────────────────────────────────────
create or replace function public.d1_set_discover(p_actor uuid, p_group uuid, p_on boolean, p_blurb text, p_day smallint, p_area text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.d1_groups%rowtype;
begin
  select * into g from public.d1_groups where id = p_group;
  if not found then
    raise exception 'Group not found.' using errcode = 'P0002';
  end if;
  if not public.d1_can_manage_group(p_group, p_actor) then
    raise exception 'Only the group''s leaders can change this.' using errcode = '42501';
  end if;
  if g.kind <> 'group' then
    raise exception 'Only ordinary groups can be shown in Discover.' using errcode = 'P0001';
  end if;
  if p_on and g.state <> 'active' then
    raise exception 'A paused group can''t be shown in Discover.' using errcode = 'P0001';
  end if;

  update public.d1_groups
     set discoverable = coalesce(p_on, false),
         discover_blurb = nullif(btrim(coalesce(p_blurb, '')), ''),
         meeting_day = p_day,
         meeting_area = nullif(btrim(coalesce(p_area, '')), ''),
         updated_at = now()
   where id = p_group;
  perform public.d1_emit('d1-group:' || p_group, 'group_updated', jsonb_build_object('groupId', p_group));
end;
$$;

-- ── Suitable for under-18s: a safeguarding admin's decision ─────────────────
-- Service role only; the admin route checks the Safeguarding Admin role and
-- writes the audit log. Taking the mark away also withdraws under-18s' waiting
-- requests, so none can be approved later by mistake.
create or replace function public.d1_set_u18_suitable(p_group uuid, p_suitable boolean, p_admin uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.d1_groups
     set u18_suitable = coalesce(p_suitable, false), u18_marked_by = p_admin, u18_marked_at = now()
   where id = p_group and kind = 'group';
  if not found then
    raise exception 'Group not found.' using errcode = 'P0002';
  end if;

  if not coalesce(p_suitable, false) then
    update public.d1_join_requests r
       set status = 'withdrawn', decided_at = now()
      from public.d1_members m
     where r.group_id = p_group and r.status = 'pending' and m.id = r.member_id
       and not (m.adult_on is not null and m.adult_on <= current_date);
  end if;
end;
$$;

-- ── Browsing ────────────────────────────────────────────────────────────────
-- Groups this member may see and isn't already in, with their own waiting
-- request if they have one.
create or replace function public.d1_discover_groups(p_actor uuid)
returns table (
  group_id uuid, community_id uuid, community_name text, name text, blurb text,
  meeting_day smallint, meeting_area text, u18_suitable boolean, member_count integer,
  request_id bigint, declined_until timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select g.id, g.community_id, c.name, g.name, g.discover_blurb, g.meeting_day, g.meeting_area, g.u18_suitable,
         (select count(*)::integer from public.d1_group_members gm
            join public.d1_members mm on mm.id = gm.member_id and mm.status = 'active'
           where gm.group_id = g.id and gm.left_at is null),
         (select r.id from public.d1_join_requests r where r.group_id = g.id and r.member_id = p_actor and r.status = 'pending'),
         (select max(r.decided_at) + interval '30 days' from public.d1_join_requests r
           where r.group_id = g.id and r.member_id = p_actor and r.status = 'declined'
             and r.decided_at > now() - interval '30 days')
    from public.d1_groups g
    join public.d1_communities c on c.id = g.community_id
   where public.d1_can_discover(p_actor, g.id)
     and not exists (
       select 1 from public.d1_group_members gm
        where gm.group_id = g.id and gm.member_id = p_actor and gm.left_at is null)
   order by c.name, g.name;
$$;

-- ── Asking to join ──────────────────────────────────────────────────────────
create or replace function public.d1_request_join(p_actor uuid, p_group uuid, p_note text default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  rid bigint;
begin
  -- One answer for "doesn't exist", "not open" and "not for you": nothing is given away.
  if not public.d1_can_discover(p_actor, p_group) then
    raise exception 'That group isn''t open to join.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.d1_group_members where group_id = p_group and member_id = p_actor and left_at is null) then
    raise exception 'You''re already in this group.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.d1_join_requests where group_id = p_group and member_id = p_actor and status = 'pending') then
    raise exception 'You''ve already asked to join this group.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.d1_join_requests
              where group_id = p_group and member_id = p_actor and status = 'declined'
                and decided_at > now() - interval '30 days') then
    raise exception 'You can ask to join this group again in a few weeks.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.d1_join_requests where member_id = p_actor and status = 'pending') >= 3 then
    raise exception 'You can have 3 requests waiting at a time. Cancel one, or wait for an answer.' using errcode = 'P0001';
  end if;

  insert into public.d1_join_requests (group_id, member_id, note)
    values (p_group, p_actor, nullif(btrim(coalesce(p_note, '')), ''))
    returning id into rid;
  perform public.d1_emit('d1-group:' || p_group, 'join_requests_changed', jsonb_build_object('groupId', p_group));
  return rid;
end;
$$;

create or replace function public.d1_withdraw_join_request(p_actor uuid, p_group uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.d1_join_requests set status = 'withdrawn', decided_at = now()
   where group_id = p_group and member_id = p_actor and status = 'pending';
  if not found then
    raise exception 'You have no request waiting for this group.' using errcode = 'P0002';
  end if;
  perform public.d1_emit('d1-group:' || p_group, 'join_requests_changed', jsonb_build_object('groupId', p_group));
end;
$$;

-- ── Approving or declining ──────────────────────────────────────────────────
-- A manager of the group. Approval re-checks d1_can_discover, so an under-18
-- cannot be approved into a group that isn't (or is no longer) marked suitable,
-- and nobody is added to a group that was paused or closed since they asked.
-- Returns the requester's member id.
create or replace function public.d1_decide_join_request(p_actor uuid, p_request bigint, p_approve boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.d1_join_requests%rowtype;
begin
  select * into r from public.d1_join_requests where id = p_request for update;
  if not found then
    raise exception 'That request doesn''t exist.' using errcode = 'P0002';
  end if;
  if not public.d1_can_manage_group(r.group_id, p_actor) then
    raise exception 'Only the group''s leaders can answer requests.' using errcode = '42501';
  end if;
  if r.status <> 'pending' then
    raise exception 'That request has already been answered or withdrawn.' using errcode = 'P0001';
  end if;

  if p_approve then
    if not public.d1_can_discover(r.member_id, r.group_id) then
      raise exception 'This person can''t be added to this group through Discover any more.' using errcode = 'P0001';
    end if;
    perform public.d1__join_group(r.group_id, array[r.member_id], p_actor, 'member');
  end if;

  update public.d1_join_requests
     set status = case when p_approve then 'approved' else 'declined' end, decided_by = p_actor, decided_at = now()
   where id = p_request;
  perform public.d1_emit('d1-group:' || r.group_id, 'join_requests_changed', jsonb_build_object('groupId', r.group_id));
  return r.member_id;
end;
$$;

revoke all on function public.d1_can_discover(uuid, uuid) from public, anon, authenticated;
grant execute on function public.d1_can_discover(uuid, uuid) to service_role;
revoke all on function public.d1_set_discover(uuid, uuid, boolean, text, smallint, text) from public, anon, authenticated;
grant execute on function public.d1_set_discover(uuid, uuid, boolean, text, smallint, text) to service_role;
revoke all on function public.d1_set_u18_suitable(uuid, boolean, uuid) from public, anon, authenticated;
grant execute on function public.d1_set_u18_suitable(uuid, boolean, uuid) to service_role;
revoke all on function public.d1_discover_groups(uuid) from public, anon, authenticated;
grant execute on function public.d1_discover_groups(uuid) to service_role;
revoke all on function public.d1_request_join(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.d1_request_join(uuid, uuid, text) to service_role;
revoke all on function public.d1_withdraw_join_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.d1_withdraw_join_request(uuid, uuid) to service_role;
revoke all on function public.d1_decide_join_request(uuid, bigint, boolean) from public, anon, authenticated;
grant execute on function public.d1_decide_join_request(uuid, bigint, boolean) to service_role;
