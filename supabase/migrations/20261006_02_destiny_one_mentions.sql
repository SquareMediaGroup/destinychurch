-- Destiny One part 12: @mentions (D1 v0.8).
--
-- A message can name people in its group ("@Leah Simmons"). The text itself
-- is sealed like any body; who was mentioned is kept beside it as member ids,
-- in plain, because the server needs them to notify those people (a mention
-- reaches you even in a group you've muted). That's no more than the group's
-- member list already says.
--
-- The database keeps only ids that are current members of the group (never
-- the sender), so a mention can't be used to reach someone outside it.
-- Edits can change who's mentioned, through d1_edit_message as before.

alter table public.d1_messages add column if not exists mentions uuid[] not null default '{}'
  constraint d1_messages_mentions_size check (cardinality(mentions) <= 50);

/** The ids in p_ids that are current members of the group, without the sender, de-duplicated. */
create or replace function public.d1_valid_mentions(p_group uuid, p_actor uuid, p_ids uuid[])
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct x), '{}')
  from unnest(coalesce(p_ids, '{}')) x
  where x is distinct from p_actor and public.d1_is_current_member(p_group, x);
$$;

revoke all on function public.d1_valid_mentions(uuid, uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.d1_valid_mentions(uuid, uuid, uuid[]) to service_role;

-- ── Immutability: mentions change only with an edit ────────────────────────

create or replace function public.d1_messages_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  editing boolean := coalesce(current_setting('d1.editing', true), '') = 'on';
begin
  if (new.body is distinct from old.body
        -- The backfill (scripts/destiny-one/encrypt-messages.mjs) replaces a
        -- plaintext body with its sealed form, once.
        and not (old.body not like 'd1e:%' and new.body like 'd1e:%')
        -- An edit, made through d1_edit_message (which saved the old text).
        and not editing)
     or (new.edited_at is distinct from old.edited_at and not editing)
     or (new.mentions is distinct from old.mentions and not editing)
     or new.group_id is distinct from old.group_id
     or new.attachment_id is distinct from old.attachment_id
     or new.reply_to is distinct from old.reply_to
     or new.created_at is distinct from old.created_at
     or (new.sender_id is distinct from old.sender_id and new.sender_id is not null) then
    raise exception 'Messages cannot be edited.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- ── Posting takes the mentions ──────────────────────────────────────────────

drop function if exists public.d1_post_message(uuid, uuid, text, bigint, uuid, jsonb, text[]);

create or replace function public.d1_post_message(
  p_actor uuid,
  p_group uuid,
  p_body text,
  p_reply_to bigint default null,
  p_attachment uuid default null,
  p_content jsonb default null,
  p_terms text[] default null,
  p_mentions uuid[] default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  mid bigint;
begin
  insert into public.d1_messages (group_id, sender_id, body, reply_to, attachment_id, content, mentions)
    values (p_group, p_actor, nullif(btrim(coalesce(p_body, '')), ''), p_reply_to, p_attachment, p_content,
            public.d1_valid_mentions(p_group, p_actor, p_mentions))
    returning id into mid;

  insert into public.d1_message_terms (group_id, term, message_id)
    select distinct p_group, t, mid from unnest(coalesce(p_terms, '{}')) t;

  update public.d1_group_members set last_read_message_id = mid
    where group_id = p_group and member_id = p_actor;

  -- No d1_emit here: the API broadcasts the opened message (see 20261004_01).
  return mid;
end;
$$;

revoke all on function public.d1_post_message(uuid, uuid, text, bigint, uuid, jsonb, text[], uuid[]) from public, anon, authenticated;
grant execute on function public.d1_post_message(uuid, uuid, text, bigint, uuid, jsonb, text[], uuid[]) to service_role;

-- ── Editing can change them (null leaves them as they were) ─────────────────

drop function if exists public.d1_edit_message(uuid, bigint, text, text[]);

create or replace function public.d1_edit_message(
  p_actor uuid,
  p_message bigint,
  p_body text,
  p_terms text[] default null,
  p_mentions uuid[] default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.d1_messages%rowtype;
  g public.d1_groups%rowtype;
  stamp timestamptz := now();
begin
  select * into m from public.d1_messages where id = p_message for update;
  if not found or m.sender_id is distinct from p_actor then
    raise exception 'You can only edit your own messages.' using errcode = 'P0001';
  end if;
  if m.deleted_at is not null then
    raise exception 'That message was deleted.' using errcode = 'P0001';
  end if;
  if m.body is null then
    raise exception 'Only messages with text can be edited.' using errcode = 'P0001';
  end if;
  if m.created_at < stamp - interval '15 minutes' then
    raise exception 'Messages can only be edited for 15 minutes after sending.' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_body, '')), '') is null then
    raise exception 'A message can''t be edited to say nothing. Delete it instead.' using errcode = 'P0001';
  end if;

  select * into g from public.d1_groups where id = m.group_id;
  if g.state is distinct from 'active' then
    raise exception 'This group is paused and read-only for now.' using errcode = 'P0001';
  end if;
  if not public.d1_is_current_member(m.group_id, p_actor) then
    raise exception 'Only current, active members can post in this group.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.d1_message_edits where message_id = m.id) >= 10 then
    raise exception 'This message has been edited too many times.' using errcode = 'P0001';
  end if;

  insert into public.d1_message_edits (message_id, group_id, previous_body, edited_at)
    values (m.id, m.group_id, m.body, stamp);

  perform set_config('d1.editing', 'on', true);
  update public.d1_messages
    set body = btrim(p_body),
        edited_at = stamp,
        mentions = case when p_mentions is null then mentions
                        else public.d1_valid_mentions(m.group_id, p_actor, p_mentions) end
    where id = m.id;
  perform set_config('d1.editing', '', true);

  delete from public.d1_message_terms where message_id = m.id;
  insert into public.d1_message_terms (group_id, term, message_id)
    select distinct m.group_id, t, m.id from unnest(coalesce(p_terms, '{}')) t;

  return stamp;
end;
$$;

revoke all on function public.d1_edit_message(uuid, bigint, text, text[], uuid[]) from public, anon, authenticated;
grant execute on function public.d1_edit_message(uuid, bigint, text, text[], uuid[]) to service_role;
