-- Destiny One part 11: editing your own messages (D1 v0.8).
--
-- Messages were immutable so the review trail always showed what was really
-- sent. Editing keeps that promise a different way: the text being replaced
-- is copied into d1_message_edits first (still sealed), so the safeguarding
-- transcript shows every version. Members only ever see the latest, marked
-- "Edited".
--
-- Rules, enforced here rather than trusted from the API:
--   • only the sender, only while they're a current member of an active group;
--   • only text (a message that was just a photo, poll or event has no body
--     to edit), never a deleted message;
--   • only within 15 minutes of sending, and at most 10 times.
-- The new text arrives sealed with fresh search terms, which replace the old
-- ones, so search finds what the message says now.
--
-- Needs 20261004_01 (d1_message_terms, the sealed-once trigger) and, in
-- production, 20261004_02 (bodies must be sealed: that check covers edits too).

alter table public.d1_messages add column if not exists edited_at timestamptz;

create table if not exists public.d1_message_edits (
  id bigint generated always as identity primary key,
  message_id bigint not null references public.d1_messages (id) on delete cascade,
  group_id uuid not null references public.d1_groups (id) on delete cascade,
  -- The text as it was before this edit, sealed exactly as it was stored.
  previous_body text not null check (char_length(previous_body) <= 24000),
  edited_at timestamptz not null default now()
);

create index if not exists d1_message_edits_message_idx on public.d1_message_edits (message_id, id);

comment on table public.d1_message_edits is
  'Earlier versions of edited Destiny One messages (sealed), for safeguarding review. Removed with the message by the retention purge.';

alter table public.d1_message_edits enable row level security;
revoke all on table public.d1_message_edits from public, anon, authenticated;
grant select, insert on table public.d1_message_edits to service_role;

-- ── The immutability trigger lets d1_edit_message through, and nothing else ──
-- d1_edit_message sets d1.editing for its own transaction only (set_config
-- with is_local), so a plain UPDATE from anywhere else is still refused.

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

create or replace function public.d1_edit_message(
  p_actor uuid,
  p_message bigint,
  p_body text,
  p_terms text[] default null
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

  -- The review trail first: what it said until now.
  insert into public.d1_message_edits (message_id, group_id, previous_body, edited_at)
    values (m.id, m.group_id, m.body, stamp);

  perform set_config('d1.editing', 'on', true);
  update public.d1_messages set body = btrim(p_body), edited_at = stamp where id = m.id;
  perform set_config('d1.editing', '', true);

  -- Search follows the new wording.
  delete from public.d1_message_terms where message_id = m.id;
  insert into public.d1_message_terms (group_id, term, message_id)
    select distinct m.group_id, t, m.id from unnest(coalesce(p_terms, '{}')) t;

  return stamp;
end;
$$;

revoke all on function public.d1_edit_message(uuid, bigint, text, text[]) from public, anon, authenticated;
grant execute on function public.d1_edit_message(uuid, bigint, text, text[]) to service_role;
