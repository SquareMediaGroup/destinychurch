-- Admin-portal twin of 20260929_05: d1_admin_create_group accepts any number of
-- people (even none). A group below 3 people / 2 verified adults is inserted
-- paused (frozen/auto, no safeguarding event) and opens itself once the rule
-- holds. Everyone chosen must still have an active account, and group admins
-- must still be verified adults (d1_group_members_guard).

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
  total integer;
  adults integer;
  reason text;
begin
  select coalesce(array_agg(distinct x), '{}') into everyone
    from unnest(coalesce(p_members, '{}') || coalesce(p_admins, '{}')) as x;

  select count(*), count(*) filter (where m.adult_on is not null and m.adult_on <= current_date)
    into total, adults
    from public.d1_members m
    where m.id = any (everyone) and m.status = 'active';

  if total <> cardinality(everyone) then
    raise exception 'Everyone in a group must have an active account.' using errcode = 'P0001';
  end if;

  if total < 3 or adults < 2 then
    reason := case
      when adults < 2 and total < 3 then
        format('Needs at least 3 members including 2 verified adults (has %s members, %s adults).', total, adults)
      when adults < 2 then
        format('Needs at least 2 verified adults (has %s).', adults)
      else
        format('Needs at least 3 members (has %s).', total)
    end;
  end if;

  insert into public.d1_groups (community_id, kind, name, department, description,
                                state, freeze_kind, frozen_reason, frozen_at)
    values (p_community, 'group', btrim(p_name),
            nullif(btrim(coalesce(p_department, '')), ''),
            nullif(btrim(coalesce(p_description, '')), ''),
            case when reason is null then 'active' else 'frozen' end,
            case when reason is null then null else 'auto' end,
            reason,
            case when reason is null then null else now() end)
    returning id into gid;

  perform public.d1__join_group(gid, everyone, null, 'member');
  if cardinality(coalesce(p_admins, '{}')) > 0 then
    update public.d1_group_members set role = 'admin'
      where group_id = gid and member_id = any (p_admins);
  end if;
  return gid;
end;
$$;
