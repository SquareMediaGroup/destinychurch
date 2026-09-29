-- Destiny One part 4: searching messages from the app.
--
-- Search returns exactly what the member could already scroll to in the chat:
-- groups they're currently in (not archived), messages sent since they joined,
-- and never a deleted message (whose body is kept only for safeguarding).
-- Full-text search over a stored tsvector with a GIN index; the BFF turns the
-- typed words into a prefix query ("run sh" → run:* & sh:*).

alter table public.d1_messages
  add column if not exists search tsvector
    generated always as (to_tsvector('english', coalesce(body, ''))) stored;

create index if not exists d1_messages_search_idx on public.d1_messages using gin (search);

create or replace function public.d1_search_messages(p_actor uuid, p_query text, p_limit integer default 30)
returns table (
  id bigint,
  group_id uuid,
  group_name text,
  community_name text,
  sender_id uuid,
  sender_name text,
  body text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  q tsquery;
begin
  begin
    q := to_tsquery('english', p_query);
  exception when others then
    return; -- a malformed query finds nothing rather than erroring
  end;
  if q is null or numnode(q) = 0 then
    return;
  end if;

  return query
    select m.id, m.group_id, g.name, c.name, m.sender_id, s.display_name, m.body, m.created_at
    from public.d1_group_members gm
    join public.d1_groups g on g.id = gm.group_id and g.state <> 'archived'
    join public.d1_communities c on c.id = g.community_id
    join public.d1_messages m on m.group_id = gm.group_id
      and m.created_at >= gm.joined_at
      and m.deleted_at is null
      and m.search @@ q
    left join public.d1_members s on s.id = m.sender_id
    where gm.member_id = p_actor and gm.left_at is null
    order by m.created_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 50);
end;
$$;

revoke all on function public.d1_search_messages(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.d1_search_messages(uuid, text, integer) to service_role;
