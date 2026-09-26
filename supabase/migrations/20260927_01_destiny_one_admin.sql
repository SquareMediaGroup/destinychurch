-- Destiny One, part 2: staff-verified identity, invites, the website admin
-- section, and the Destiny One Admin role.
--
-- Part 1 (20260926_01_destiny_one.sql) took real names and adult status from
-- ChurchSuite. Destiny wants to lean on ChurchSuite as little as possible, so
-- the people who verify a member are now Destiny's own staff:
--
--   • INVITE  — a Destiny One Admin invites someone by email with their name
--               and whether they're an adult. Signing in with that email
--               (the one-time code proves they own it) activates them.
--   • REQUEST — anyone else can sign in and ask for access, giving their name
--               and date of birth. An admin reviews and approves them as an
--               adult or an under-18.
--   • CHURCHSUITE — still works for staff who sign in with it, but is optional.
--
-- adult_on is still the one field the 2-adult rule reads, so none of part 1's
-- rules change. What it means when staff set it:
--   adult, no DOB given   → adult_on = the day they were verified ("known to be
--                           an adult from this date", which is true)
--   under-18 with a DOB   → adult_on = their 18th birthday (flips on its own)
--   under-18, no DOB      → adult_on null: a minor until someone changes it
-- A date of birth someone types in about themselves goes into
-- declared_adult_on, which the reviewer sees and NO rule ever reads.
--
-- New hard rule: nobody becomes `active` without a verification record.

-- ── Members: verification ───────────────────────────────────────────────────

alter table public.d1_members
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users (id) on delete set null,
  add column if not exists verification_source text
    check (verification_source in ('invite', 'admin', 'churchsuite')),
  add column if not exists declared_adult_on date,
  add column if not exists request_note text
    check (char_length(coalesce(request_note, '')) <= 500),
  add column if not exists request_submitted_at timestamptz;

comment on column public.d1_members.declared_adult_on is
  'Self-declared 18th birthday from an access request. Shown to the reviewer only; never counts toward the 2-adult rule.';

-- Redefined from part 1 to add the verification requirement.
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

  if new.status = 'active' then
    -- Someone at Destiny (or an invite they sent, or ChurchSuite) has vouched
    -- for this person. A self-service sign-in alone never gets here.
    if new.verified_at is null or new.verification_source is null then
      raise exception 'Members must be verified before they can be activated.' using errcode = 'P0001';
    end if;

    if new.auth_user_id is not null then
      select (u.phone is not null and u.phone <> '') into has_phone
        from auth.users u where u.id = new.auth_user_id;
      if coalesce(has_phone, false) then
        raise exception 'Accounts with a phone number cannot be activated.' using errcode = 'P0001';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- ── Invites ─────────────────────────────────────────────────────────────────

create table if not exists public.d1_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null
    check (email = lower(btrim(email)) and char_length(email) between 3 and 254 and position('@' in email) > 1),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  is_adult boolean not null default true,
  -- Under-18s: their 18th birthday if staff gave a DOB. Adults: set on accept.
  adult_on date,
  roles text[] not null default '{}'
    check (roles <@ array['group_leader', 'senior_leadership']::text[]),
  community_ids uuid[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  last_sent_at timestamptz,
  accepted_member_id uuid references public.d1_members (id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint d1_invites_leaders_are_adults check (is_adult or cardinality(roles) = 0),
  constraint d1_invites_minor_dob_in_future check (is_adult or adult_on is null or adult_on > created_at::date)
);

create unique index if not exists d1_invites_one_open_per_email
  on public.d1_invites (email) where status = 'pending';
create index if not exists d1_invites_status_idx on public.d1_invites (status, created_at desc);

-- ── Settings (one row) ──────────────────────────────────────────────────────

create table if not exists public.d1_settings (
  id boolean primary key default true check (id),
  -- Off = invite-only. Destiny hasn't settled this yet, so it's a switch.
  allow_access_requests boolean not null default true,
  invite_expiry_days integer not null default 30 check (invite_expiry_days between 1 and 365),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.d1_settings (id) values (true) on conflict (id) do nothing;

do $$
declare
  t text;
begin
  foreach t in array array['d1_invites', 'd1_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "service only" on public.%I', t);
    execute format('create policy "service only" on public.%I using (false) with check (false)', t);
  end loop;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Shared rule check
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.d1__check_composition(p_members uuid[])
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  total integer;
  adults integer;
begin
  select count(*), count(*) filter (where m.adult_on is not null and m.adult_on <= current_date)
    into total, adults
    from public.d1_members m
    where m.id = any (p_members) and m.status = 'active';

  if total <> cardinality(p_members) then
    raise exception 'Everyone in a group must have an active account.' using errcode = 'P0001';
  end if;
  if total < 3 then
    raise exception 'A group needs at least 3 people. There are no one-to-one chats.' using errcode = 'P0001';
  end if;
  if adults < 2 then
    raise exception 'A group needs at least 2 verified adults.' using errcode = 'P0001';
  end if;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- Admin-path operations (website, /api/admin/destiny-one)
-- ════════════════════════════════════════════════════════════════════════════
-- No acting member: website staff may not have an app account. The route has
-- already checked the destiny_one_admin role and records who did it in the
-- audit log. Every trigger from part 1 still applies — these can't make a
-- 2-person group, a group without 2 adults, or a minor group admin.

create or replace function public.d1_admin_create_community(
  p_name text,
  p_description text default null,
  p_admins uuid[] default '{}'
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
  insert into public.d1_communities (name, description)
    values (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''))
    returning id into cid;

  insert into public.d1_groups (community_id, kind, name, state, freeze_kind, frozen_reason, frozen_at)
    values (cid, 'announcements', 'Announcements', 'frozen', 'auto',
            'Needs at least 3 members including 2 verified adults.', now())
    returning id into gid;

  if cardinality(coalesce(p_admins, '{}')) > 0 then
    perform public.d1_admin_add_community_members(cid, p_admins, 'admin');
  end if;
  return cid;
end;
$$;

create or replace function public.d1_admin_add_community_members(
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
  if p_role not in ('admin', 'member') then
    raise exception 'Unknown role.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.d1_communities where id = p_community and archived_at is null) then
    raise exception 'Community not found.' using errcode = 'P0002';
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
  perform public.d1__join_group(gid, p_members, null, 'member');
  if p_role = 'admin' then
    update public.d1_group_members set role = 'admin'
      where group_id = gid and member_id = any (p_members);
  end if;
end;
$$;

create or replace function public.d1_admin_set_community_role(p_community uuid, p_member uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
  if p_role not in ('admin', 'member') then
    raise exception 'Unknown role.' using errcode = '22023';
  end if;
  if p_role = 'admin' and not public.d1_is_adult(p_member) then
    raise exception 'Community admins must be verified adults.' using errcode = 'P0001';
  end if;
  update public.d1_community_members set role = p_role
    where community_id = p_community and member_id = p_member;
  if not found then
    raise exception 'That person is not in this community.' using errcode = 'P0002';
  end if;
  select id into gid from public.d1_groups where community_id = p_community and kind = 'announcements';
  update public.d1_group_members set role = p_role
    where group_id = gid and member_id = p_member and left_at is null;
end;
$$;

create or replace function public.d1_admin_remove_community_member(p_community uuid, p_member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
begin
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

create or replace function public.d1_admin_create_group(
  p_community uuid,
  p_name text,
  p_department text,
  p_description text,
  p_members uuid[],
  p_admins uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
  everyone uuid[];
begin
  select array_agg(distinct x) into everyone
    from unnest(coalesce(p_members, '{}') || coalesce(p_admins, '{}')) as x;
  perform public.d1__check_composition(coalesce(everyone, '{}'));

  insert into public.d1_groups (community_id, kind, name, department, description)
    values (p_community, 'group', btrim(p_name),
            nullif(btrim(coalesce(p_department, '')), ''),
            nullif(btrim(coalesce(p_description, '')), ''))
    returning id into gid;

  perform public.d1__join_group(gid, everyone, null, 'member');
  if cardinality(coalesce(p_admins, '{}')) > 0 then
    update public.d1_group_members set role = 'admin'
      where group_id = gid and member_id = any (p_admins);
  end if;
  return gid;
end;
$$;

create or replace function public.d1_admin_add_group_members(p_group uuid, p_members uuid[], p_role text default 'member')
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
  if p_role not in ('admin', 'member') then
    raise exception 'Unknown role.' using errcode = '22023';
  end if;
  perform public.d1__join_group(p_group, p_members, null, p_role);
end;
$$;

create or replace function public.d1_admin_remove_group_member(p_group uuid, p_member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select kind from public.d1_groups where id = p_group) = 'announcements' then
    raise exception 'Remove them from the community to take them out of its announcements.' using errcode = 'P0001';
  end if;
  update public.d1_group_members set left_at = now()
    where group_id = p_group and member_id = p_member and left_at is null;
  perform public.d1_emit('d1-member:' || p_member, 'group_left', jsonb_build_object('groupId', p_group));
  perform public.d1_emit('d1-group:' || p_group, 'members_changed', jsonb_build_object('groupId', p_group));
end;
$$;

create or replace function public.d1_admin_set_group_role(p_group uuid, p_member uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_role not in ('admin', 'member') then
    raise exception 'Unknown role.' using errcode = '22023';
  end if;
  update public.d1_group_members set role = p_role
    where group_id = p_group and member_id = p_member and left_at is null;
  if not found then
    raise exception 'That person is not in this group.' using errcode = 'P0002';
  end if;
  perform public.d1_emit('d1-group:' || p_group, 'members_changed', jsonb_build_object('groupId', p_group));
end;
$$;

-- ── Invites: accept ─────────────────────────────────────────────────────────
-- Called when someone signs in with an email that has an open invite. The
-- sign-in (email one-time code) has already proved they own the address.
-- Returns the member id, or null if there's no usable invite.

create or replace function public.d1_accept_invite(p_auth_user uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.d1_invites%rowtype;
  mid uuid;
  cid uuid;
begin
  update public.d1_invites set status = 'expired'
    where status = 'pending' and expires_at < now();

  select * into inv from public.d1_invites
    where email = lower(btrim(p_email)) and status = 'pending'
    for update;
  if not found then
    return null;
  end if;

  select id into mid from public.d1_members where auth_user_id = p_auth_user;

  if mid is null then
    insert into public.d1_members (auth_user_id, display_name, status, roles, adult_on,
                                   verified_at, verified_by, verification_source)
      values (p_auth_user, inv.display_name, 'active', inv.roles,
              case when inv.is_adult then coalesce(inv.adult_on, current_date) else inv.adult_on end,
              now(), inv.invited_by, 'invite')
      returning id into mid;
  else
    update public.d1_members
      set display_name = inv.display_name,
          status = case when status in ('pending', 'active') then 'active' else status end,
          roles = inv.roles,
          adult_on = case when inv.is_adult then coalesce(inv.adult_on, current_date) else inv.adult_on end,
          verified_at = now(), verified_by = inv.invited_by, verification_source = 'invite'
      where id = mid;
  end if;

  foreach cid in array inv.community_ids loop
    if exists (select 1 from public.d1_communities where id = cid and archived_at is null) then
      perform public.d1_admin_add_community_members(cid, array[mid], 'member');
    end if;
  end loop;

  update public.d1_invites
    set status = 'accepted', accepted_member_id = mid, accepted_at = now()
    where id = inv.id;
  return mid;
end;
$$;

-- ── Admin reads ─────────────────────────────────────────────────────────────
-- The member list with sign-in email joined from auth.users in one query
-- (per-row Auth admin calls don't scale past a few dozen people). Email is for
-- staff finding and verifying people; it never goes to the app.

create or replace function public.d1_admin_members(p_status text default null)
returns table (
  id uuid,
  display_name text,
  email text,
  status text,
  roles text[],
  adult_on date,
  declared_adult_on date,
  request_note text,
  request_submitted_at timestamptz,
  verified_at timestamptz,
  verification_source text,
  churchsuite_contact_id bigint,
  churchsuite_child_id bigint,
  created_at timestamptz,
  community_count integer,
  group_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.display_name, u.email::text, m.status, m.roles, m.adult_on, m.declared_adult_on,
         m.request_note, m.request_submitted_at, m.verified_at, m.verification_source,
         m.churchsuite_contact_id, m.churchsuite_child_id, m.created_at,
         (select count(*)::integer from public.d1_community_members cm where cm.member_id = m.id),
         (select count(*)::integer from public.d1_group_members gm
            join public.d1_groups g on g.id = gm.group_id
            where gm.member_id = m.id and gm.left_at is null and g.kind = 'group')
  from public.d1_members m
  left join auth.users u on u.id = m.auth_user_id
  where m.status <> 'deleted'
    and (p_status is null or m.status = p_status)
  order by m.created_at desc;
$$;

-- Groups with live counts, for the communities pages.
create or replace function public.d1_admin_groups(p_community uuid default null)
returns table (
  id uuid,
  community_id uuid,
  kind text,
  name text,
  department text,
  description text,
  state text,
  freeze_kind text,
  frozen_reason text,
  created_at timestamptz,
  member_count integer,
  adult_count integer
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
  where (p_community is null or g.community_id = p_community)
  order by g.kind, g.name;
$$;

-- ── Notifications routed by role ────────────────────────────────────────────
-- Part 1 sent every safeguarding event to safeguarding_admin. Now:
--   frozen (automatic) → destiny_one_admin (fix the membership) + safeguarding_admin
--   report             → safeguarding_admin only
--   unfrozen / manual  → nobody (logged, and manual ones were done by safeguarding)

create or replace function public.d1_safeguarding_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  gname text;
  summary text;
  roles text[];
  r text;
  nid bigint;
  created timestamptz;
  payload jsonb;
  href text;
begin
  roles := case new.kind
    when 'frozen' then array['destiny_one_admin', 'safeguarding_admin']
    when 'report' then array['safeguarding_admin']
    else null
  end;
  if roles is null then
    return null;
  end if;

  select name into gname from public.d1_groups where id = new.group_id;
  summary := case new.kind
    when 'frozen' then format('Destiny One group "%s" was paused: %s', coalesce(gname, '?'), new.detail)
    else format('A message was reported in Destiny One group "%s"', coalesce(gname, '?'))
  end;
  href := case new.kind
    when 'report' then '/admin/destiny-one/safeguarding'
    else '/admin/destiny-one/communities'
  end;

  insert into public.notifications (section, kind, entity_id, entity_label, summary, href, roles, metadata)
    values ('destiny_one', 'd1_' || new.kind, new.id::text, gname, left(summary, 500), href, roles,
            jsonb_build_object('groupId', new.group_id))
    returning id, created_at into nid, created;

  payload := jsonb_build_object(
    'id', nid, 'createdAt', created, 'section', 'destiny_one', 'kind', 'd1_' || new.kind,
    'entityId', new.id::text, 'entityLabel', gname, 'summary', left(summary, 500),
    'href', href, 'roles', to_jsonb(roles));

  foreach r in array roles || array['super_admin'] loop
    perform realtime.send(payload, 'notification', 'admin-notifications:' || r, true);
  end loop;
  return null;
end;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'd1\_%'
      and p.proname not in ('d1_current_member_id', 'd1_can_receive')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end;
$$;

-- ── Destiny One Admin role ──────────────────────────────────────────────────
-- Runs the app day to day: invites, approvals, members, communities, groups,
-- settings. Deliberately CANNOT read messages — that is safeguarding_admin
-- only, and audited.

alter table public.admin_roles
  add column if not exists destiny_one_admin boolean not null default false;

comment on column public.admin_roles.destiny_one_admin is
  'Can reach /admin/destiny-one (except safeguarding): invites, approvals, members, communities, groups, settings. No message content.';

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
          when 'destiny_one_admin'  then r.destiny_one_admin
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
