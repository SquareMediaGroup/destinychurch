-- Destiny One part 13: pinned messages (D1 v0.8).
--
-- People who manage a group (its admins, the community's admins, senior
-- leaders: d1_can_manage_group) can pin up to 3 messages, shown in a bar at
-- the top of the chat. Pinning a fourth unpins the oldest, as in WhatsApp.
-- Members only ever see pins on messages they can see anyway (the API applies
-- the same "since you joined, not deleted, not blocked" rules), so a pin
-- can't surface history from before someone joined.
--
-- The pins_changed event carries no message text, so it goes through d1_emit.

create table if not exists public.d1_pins (
  group_id uuid not null references public.d1_groups (id) on delete cascade,
  message_id bigint not null references public.d1_messages (id) on delete cascade,
  pinned_by uuid references public.d1_members (id) on delete set null,
  pinned_at timestamptz not null default now(),
  primary key (group_id, message_id)
);

create index if not exists d1_pins_group_idx on public.d1_pins (group_id, pinned_at desc);

alter table public.d1_pins enable row level security;
revoke all on table public.d1_pins from public, anon, authenticated;
grant select, insert, delete on table public.d1_pins to service_role;

create or replace function public.d1_pin_message(p_actor uuid, p_message bigint, p_pin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.d1_messages%rowtype;
begin
  select * into m from public.d1_messages where id = p_message;
  if not found then
    raise exception 'That message doesn''t exist.' using errcode = 'P0001';
  end if;
  if not public.d1_can_manage_group(m.group_id, p_actor) or not public.d1_is_current_member(m.group_id, p_actor) then
    raise exception 'Only group admins can pin messages.' using errcode = 'P0001';
  end if;

  if not p_pin then
    delete from public.d1_pins where group_id = m.group_id and message_id = m.id;
  else
    if m.deleted_at is not null then
      raise exception 'That message was deleted.' using errcode = 'P0001';
    end if;
    insert into public.d1_pins (group_id, message_id, pinned_by)
      values (m.group_id, m.id, p_actor)
      on conflict (group_id, message_id) do update set pinned_at = now(), pinned_by = excluded.pinned_by;
    -- Keep the 3 newest pins.
    delete from public.d1_pins
      where group_id = m.group_id
        and message_id not in (select message_id from public.d1_pins where group_id = m.group_id order by pinned_at desc, message_id desc limit 3);
  end if;

  perform public.d1_emit('d1-group:' || m.group_id, 'pins_changed', jsonb_build_object('groupId', m.group_id));
end;
$$;

revoke all on function public.d1_pin_message(uuid, bigint, boolean) from public, anon, authenticated;
grant execute on function public.d1_pin_message(uuid, bigint, boolean) to service_role;
