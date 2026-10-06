-- Destiny One part 16: forwarding a message to another group (D1 v0.8).
--
-- A forward is a new message in the other group, sent by the person who
-- forwarded it, marked "Forwarded". It keeps a link to the original
-- (forwarded_from) so the safeguarding transcript can say where it came from.
-- Members only see "Forwarded"; who wrote the original isn't carried across.
--
-- The rules sit in d1_post_message: you can only forward a message you can
-- see (you're in its group now and were when it was sent, it isn't deleted).
-- Posting rules in the target group apply as for any message. The API copies
-- the text (sealed again for the target group) and any photo or PDF (copied
-- into the target group's folder, so the two never share a file).

alter table public.d1_messages add column if not exists forwarded_from bigint
  references public.d1_messages (id) on delete set null;

drop function if exists public.d1_post_message(uuid, uuid, text, bigint, uuid, jsonb, text[], uuid[]);

create or replace function public.d1_post_message(
  p_actor uuid,
  p_group uuid,
  p_body text,
  p_reply_to bigint default null,
  p_attachment uuid default null,
  p_content jsonb default null,
  p_terms text[] default null,
  p_mentions uuid[] default null,
  p_forwarded_from bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  mid bigint;
  src public.d1_messages%rowtype;
begin
  if p_forwarded_from is not null then
    select * into src from public.d1_messages where id = p_forwarded_from;
    if not found or src.deleted_at is not null or not exists (
      select 1 from public.d1_group_members gm
      where gm.group_id = src.group_id and gm.member_id = p_actor
        and gm.left_at is null and gm.joined_at <= src.created_at
    ) then
      raise exception 'You can only forward messages you can see.' using errcode = 'P0001';
    end if;
  end if;

  insert into public.d1_messages (group_id, sender_id, body, reply_to, attachment_id, content, mentions, forwarded_from)
    values (p_group, p_actor, nullif(btrim(coalesce(p_body, '')), ''), p_reply_to, p_attachment, p_content,
            public.d1_valid_mentions(p_group, p_actor, p_mentions), p_forwarded_from)
    returning id into mid;

  insert into public.d1_message_terms (group_id, term, message_id)
    select distinct p_group, t, mid from unnest(coalesce(p_terms, '{}')) t;

  update public.d1_group_members set last_read_message_id = mid
    where group_id = p_group and member_id = p_actor;

  -- No d1_emit here: the API broadcasts the opened message (see 20261004_01).
  return mid;
end;
$$;

revoke all on function public.d1_post_message(uuid, uuid, text, bigint, uuid, jsonb, text[], uuid[], bigint) from public, anon, authenticated;
grant execute on function public.d1_post_message(uuid, uuid, text, bigint, uuid, jsonb, text[], uuid[], bigint) to service_role;
