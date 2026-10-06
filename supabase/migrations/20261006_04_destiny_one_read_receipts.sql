-- Destiny One part 14: "Seen by" read receipts (D1 v0.8).
--
-- Until now read state was private: last_read_message_id only drove your own
-- unread counts. Now the sender of a message (and the group's managers, who
-- need it for announcements) can see who has read it, from that same marker.
--
-- It's a setting, on by default and reciprocal as in WhatsApp: turn Read
-- receipts off and nobody sees whether you've read their messages, and you
-- don't see anyone else's. The peek preview in the chat list never moves the
-- marker, so it never counts as reading.
--
-- Only the read marker is used: no "read at" time is stored or shown.

alter table public.d1_members add column if not exists read_receipts boolean not null default true;

comment on column public.d1_members.read_receipts is
  'Shares (and sees) read receipts. Off: nobody sees whether this member has read their messages, and they see no one''s.';

create or replace function public.d1_read_receipts(p_actor uuid, p_message bigint)
returns table (member_id uuid, display_name text, status text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m public.d1_messages%rowtype;
begin
  select * into m from public.d1_messages where id = p_message;
  if not found or m.deleted_at is not null then
    raise exception 'That message doesn''t exist.' using errcode = 'P0001';
  end if;
  if not public.d1_is_current_member(m.group_id, p_actor) then
    raise exception 'That message doesn''t exist.' using errcode = 'P0001';
  end if;
  if m.sender_id is distinct from p_actor and not public.d1_can_manage_group(m.group_id, p_actor) then
    raise exception 'You can only see who has read your own messages.' using errcode = 'P0001';
  end if;
  if not (select read_receipts from public.d1_members where id = p_actor) then
    raise exception 'Turn on read receipts to see who has read messages.' using errcode = 'P0001';
  end if;

  return query
    select mb.id, mb.display_name,
           case
             when not mb.read_receipts then 'hidden'
             when gm.last_read_message_id >= m.id then 'read'
             else 'unread'
           end
    from public.d1_group_members gm
    join public.d1_members mb on mb.id = gm.member_id and mb.status = 'active'
    where gm.group_id = m.group_id
      and gm.left_at is null
      and gm.member_id is distinct from m.sender_id
      -- Only people who were there when it was sent.
      and gm.joined_at <= m.created_at
    order by mb.display_name;
end;
$$;

revoke all on function public.d1_read_receipts(uuid, bigint) from public, anon, authenticated;
grant execute on function public.d1_read_receipts(uuid, bigint) to service_role;
