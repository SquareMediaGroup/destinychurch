-- Destiny One part 3: group leaders invite people by email from the app.
--
-- A staff invite (d1_invites, part 2) pre-approves someone: they're active the
-- moment they sign in, with the age staff set. A LEADER invite must not do
-- that — the 2-adults rule depends on staff confirming age. So a leader invite
-- is flagged `needs_approval`: on sign-in the person becomes an access request
-- (pending, request_submitted_at set), pre-filled with their name, who invited
-- them and to which group. The leader's "adult / under 18" is only a hint
-- (declared_adult_on, which no rule reads). When a Destiny One Admin approves
-- the request they're added to the community and group automatically.

alter table public.d1_invites
  add column if not exists needs_approval boolean not null default false,
  add column if not exists group_ids uuid[] not null default '{}',
  add column if not exists invited_by_member uuid references public.d1_members (id) on delete set null,
  add column if not exists note text check (char_length(coalesce(note, '')) <= 500);

comment on column public.d1_invites.needs_approval is
  'Leader invite: sign-in creates an access request for staff to approve, never an active account.';
comment on column public.d1_invites.group_ids is
  'Groups to join once approved (leader invites).';

-- A leader invite can't carry leader roles.
alter table public.d1_invites drop constraint if exists d1_invites_leader_invites_no_roles;
alter table public.d1_invites add constraint d1_invites_leader_invites_no_roles
  check (not needs_approval or cardinality(roles) = 0);

alter table public.d1_members
  add column if not exists request_group_ids uuid[] not null default '{}',
  add column if not exists invited_by_member uuid references public.d1_members (id) on delete set null;

comment on column public.d1_members.request_group_ids is
  'Groups a leader invited them to; joined when a Destiny One Admin approves the request.';

-- ── Accept on sign-in ───────────────────────────────────────────────────────
-- Same as part 2 for staff invites. For leader invites: pending + request.

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

  if inv.needs_approval then
    -- Never activates. Anyone already active/suspended/deleted is left alone.
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

revoke all on function public.d1_accept_invite(uuid, text) from public, anon, authenticated;
grant execute on function public.d1_accept_invite(uuid, text) to service_role;
