-- Groups can be created with any number of people (even just the creator).
-- The composition rule still governs whether a group is usable: one that has
-- fewer than 3 people or 2 verified adults is created PAUSED (state 'frozen',
-- freeze_kind 'auto') and lifts itself the moment the rule holds, exactly as
-- d1_evaluate_group already does when people leave. Inserted paused rather than
-- left to the trigger so a brand-new small group doesn't raise a safeguarding
-- event; it isn't a breach, it just isn't open yet.

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
  reason text;
begin
  if not public.d1_is_leader(p_actor) then
    raise exception 'Only group leaders and senior leadership can create groups.' using errcode = '42501';
  end if;
  if not public.d1_is_adult(p_actor) then
    raise exception 'Group creators must be verified adults.' using errcode = '42501';
  end if;
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

  insert into public.d1_groups (community_id, kind, name, department, description, created_by,
                                state, freeze_kind, frozen_reason, frozen_at)
    values (p_community, 'group', btrim(p_name),
            nullif(btrim(coalesce(p_department, '')), ''),
            nullif(btrim(coalesce(p_description, '')), ''), p_actor,
            case when reason is null then 'active' else 'frozen' end,
            case when reason is null then null else 'auto' end,
            reason,
            case when reason is null then null else now() end)
    returning id into gid;

  perform public.d1__join_group(gid, array[p_actor], p_actor, 'admin');
  perform public.d1__join_group(gid, array_remove(everyone, p_actor), p_actor, 'member');
  return gid;
end;
$$;
