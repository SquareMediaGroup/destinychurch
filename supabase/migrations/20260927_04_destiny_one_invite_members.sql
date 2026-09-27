-- Destiny One part 5: invited people exist before they sign in, and the app
-- can check an email before sending a code.
--
-- 1. A STAFF invite now creates the member straight away (auth_user_id null,
--    active, staff-verified, in the invite's communities), so staff can put
--    them into groups on the website before they ever open the app. Signing
--    in with the invited email links the login to that member
--    (d1_accept_invite). Revoking an invite before they sign in erases it.
--    Leader invites (needs_approval) are unchanged: no member until staff
--    approve.
-- 2. d1_sign_in_status(email) tells the app, before it sends a code, whether
--    this email can get in at all.

alter table public.d1_invites
  add column if not exists member_id uuid references public.d1_members (id) on delete set null;

create index if not exists d1_invites_member_idx on public.d1_invites (member_id);

comment on column public.d1_invites.member_id is
  'Staff invites: the member created at invite time, linked to a login on first sign-in.';

-- ── Create the member for a staff invite ────────────────────────────────────

create or replace function public.d1_invite_create_member(p_invite uuid)
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
  select * into inv from public.d1_invites where id = p_invite for update;
  if not found then
    raise exception 'Invite not found.' using errcode = 'P0002';
  end if;
  if inv.needs_approval then
    raise exception 'Leader invites wait for staff approval.' using errcode = 'P0001';
  end if;
  if inv.member_id is not null then
    return inv.member_id;
  end if;

  insert into public.d1_members (auth_user_id, display_name, status, roles, adult_on,
                                 verified_at, verified_by, verification_source)
    values (null, inv.display_name, 'active', inv.roles,
            case when inv.is_adult then coalesce(inv.adult_on, current_date) else inv.adult_on end,
            now(), inv.invited_by, 'invite')
    returning id into mid;

  foreach cid in array inv.community_ids loop
    if exists (select 1 from public.d1_communities where id = cid and archived_at is null) then
      perform public.d1_admin_add_community_members(cid, array[mid], 'member');
    end if;
  end loop;

  update public.d1_invites set member_id = mid where id = inv.id;
  return mid;
end;
$$;

-- ── Accept on sign-in ───────────────────────────────────────────────────────

create or replace function public.d1_accept_invite(p_auth_user uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.d1_invites%rowtype;
  mid uuid;
  mstatus text;
  cid uuid;
  inviter text;
  group_name text;
begin
  update public.d1_invites set status = 'expired'
    where status = 'pending' and expires_at < now();

  select * into inv from public.d1_invites
    where email = lower(btrim(p_email)) and status = 'pending'
    for update;
  if not found then
    return null;
  end if;

  select id, status into mid, mstatus from public.d1_members where auth_user_id = p_auth_user;

  -- Leader invite: becomes an access request, never an active account.
  if inv.needs_approval then
    if mid is not null and mstatus <> 'pending' then
      update public.d1_invites set status = 'accepted', accepted_member_id = mid, accepted_at = now() where id = inv.id;
      return mid;
    end if;

    select display_name into inviter from public.d1_members where id = inv.invited_by_member;
    select name into group_name from public.d1_groups where id = inv.group_ids[1];

    if mid is null then
      insert into public.d1_members (auth_user_id, display_name, status)
        values (p_auth_user, inv.display_name, 'pending')
        returning id into mid;
    end if;

    update public.d1_members
      set display_name = inv.display_name,
          declared_adult_on = case when inv.is_adult then current_date else null end,
          request_note = left(
            'Invited by ' || coalesce(inviter, 'a leader')
              || coalesce(' to ' || group_name, '')
              || case when inv.is_adult then ' (leader says: adult)' else ' (leader says: under 18)' end
              || coalesce('. ' || nullif(btrim(inv.note), ''), ''),
            500),
          request_submitted_at = coalesce(request_submitted_at, now()),
          request_group_ids = inv.group_ids,
          invited_by_member = inv.invited_by_member
      where id = mid;

    update public.d1_invites set status = 'accepted', accepted_member_id = mid, accepted_at = now() where id = inv.id;
    return mid;
  end if;

  -- Staff invite whose member was created at invite time: link the login.
  if inv.member_id is not null
     and exists (select 1 from public.d1_members where id = inv.member_id and auth_user_id is null and status <> 'deleted') then
    if mid is not null then
      if mstatus <> 'pending' then
        -- Already a member under this login; leave both alone for staff.
        update public.d1_invites set status = 'accepted', accepted_member_id = mid, accepted_at = now() where id = inv.id;
        return mid;
      end if;
      -- A pending sign-in from before the invite: fold it into the invited member.
      delete from public.d1_members where id = mid;
    end if;
    update public.d1_members set auth_user_id = p_auth_user where id = inv.member_id;
    update public.d1_invites set status = 'accepted', accepted_member_id = inv.member_id, accepted_at = now() where id = inv.id;
    return inv.member_id;
  end if;

  -- Older staff invites (no member yet): create or activate, as before.
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

-- ── Can this email get in? ──────────────────────────────────────────────────
-- 'member'  — has an account (active, pending or suspended; the app then
--             shows the right screen after sign-in)
-- 'invite'  — has an open invite
-- 'request' — unknown, but access requests are open
-- 'none'    — unknown and invite-only: don't send a code

create or replace function public.d1_sign_in_status(p_email text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  e text := lower(btrim(p_email));
begin
  if exists (
    select 1 from public.d1_members m
    join auth.users u on u.id = m.auth_user_id
    where lower(u.email) = e and m.status <> 'deleted'
  ) then
    return 'member';
  end if;
  if exists (select 1 from public.d1_invites where email = e and status = 'pending' and expires_at >= now()) then
    return 'invite';
  end if;
  if coalesce((select allow_access_requests from public.d1_settings limit 1), true) then
    return 'request';
  end if;
  return 'none';
end;
$$;

-- ── Admin member list: show the invite email for people not signed in yet ──

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
    and (p_status is null or m.status = p_status)
  order by m.created_at desc;
$$;

revoke all on function public.d1_invite_create_member(uuid) from public, anon, authenticated;
grant execute on function public.d1_invite_create_member(uuid) to service_role;
revoke all on function public.d1_accept_invite(uuid, text) from public, anon, authenticated;
grant execute on function public.d1_accept_invite(uuid, text) to service_role;
revoke all on function public.d1_sign_in_status(text) from public, anon, authenticated;
grant execute on function public.d1_sign_in_status(text) to service_role;
revoke all on function public.d1_admin_members(text) from public, anon, authenticated;
grant execute on function public.d1_admin_members(text) to service_role;
