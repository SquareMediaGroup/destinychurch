-- Destiny One: reactions follow the same "only since you joined" rule as
-- everything else.
--
-- Reading, searching, forwarding and read receipts all stop at the moment a
-- member joined the group. d1_react only checked current membership, so a
-- member could react to a message from before they joined by guessing its
-- number (ids are sequential). It revealed nothing, but it put a reaction from
-- them on a message they can't see. Unchanged otherwise.

create or replace function public.d1_react(p_actor uuid, p_message bigint, p_emoji text, p_add boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
  sent_at timestamptz;
begin
  select group_id, created_at into gid, sent_at
    from public.d1_messages where id = p_message and deleted_at is null;
  if gid is null then
    raise exception 'Message not found.' using errcode = 'P0002';
  end if;
  if not public.d1_is_current_member(gid, p_actor) then
    raise exception 'Only current members can react.' using errcode = '42501';
  end if;
  -- Same answer as a message that doesn't exist: they can't see this one.
  if not exists (
    select 1 from public.d1_group_members gm
    where gm.group_id = gid and gm.member_id = p_actor
      and gm.left_at is null and gm.joined_at <= sent_at
  ) then
    raise exception 'Message not found.' using errcode = 'P0002';
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

revoke all on function public.d1_react(uuid, bigint, text, boolean) from public, anon, authenticated;
grant execute on function public.d1_react(uuid, bigint, text, boolean) to service_role;
