-- Destiny One part 5: structured message content — Poll and Event embeds.
--
-- A message can now optionally carry `content` (jsonb): either
--   {"kind":"event","event":{...snapshot captured at send time...}}
-- or
--   {"kind":"poll","poll":{"id","question","options":[{"id","label"}],"allowMultiple"}}
-- The poll's live tallies live in their own table (d1_poll_votes), not inside
-- `content` itself, so a vote never has to rewrite the message row.
--
-- Event content is an immutable snapshot: the card a member sees is what the
-- event looked like when it was shared, not a live mirror of ChurchSuite. That
-- matches how this app already prefers stable, simple records for anything
-- safeguarding-adjacent (a deleted message's body is kept as it was sent, not
-- re-derived) — see chat.server.ts.

alter table public.d1_messages
  add column if not exists content jsonb;

alter table public.d1_messages drop constraint if exists d1_messages_has_content;
alter table public.d1_messages add constraint d1_messages_has_content
  check (
    char_length(btrim(coalesce(body, ''))) > 0
    or attachment_id is not null
    or content is not null
  );

-- ── Poll votes ──────────────────────────────────────────────────────────────
-- One row per (message, member, chosen option). A single-choice poll simply
-- never has more than one row per (message, member); d1_vote() enforces that.

create table if not exists public.d1_poll_votes (
  message_id bigint not null references public.d1_messages (id) on delete cascade,
  member_id uuid not null references public.d1_members (id) on delete cascade,
  option_id text not null check (char_length(option_id) between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (message_id, member_id, option_id)
);

create index if not exists d1_poll_votes_message_idx on public.d1_poll_votes (message_id);

alter table public.d1_poll_votes enable row level security;
drop policy if exists "service only" on public.d1_poll_votes;
create policy "service only" on public.d1_poll_votes using (false) with check (false);

-- ── d1_post_message: now takes an optional content snapshot ────────────────
-- Signature changes (a new parameter), so the old 5-arg function is dropped
-- first rather than replaced in place — otherwise Postgres would keep both as
-- overloads.

drop function if exists public.d1_post_message(uuid, uuid, text, bigint, uuid);

create function public.d1_post_message(
  p_actor uuid,
  p_group uuid,
  p_body text,
  p_reply_to bigint default null,
  p_attachment uuid default null,
  p_content jsonb default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  mid bigint;
  created timestamptz;
  sender_name text;
begin
  insert into public.d1_messages (group_id, sender_id, body, reply_to, attachment_id, content)
    values (p_group, p_actor, nullif(btrim(coalesce(p_body, '')), ''), p_reply_to, p_attachment, p_content)
    returning id, created_at into mid, created;

  select display_name into sender_name from public.d1_members where id = p_actor;

  update public.d1_group_members set last_read_message_id = mid
    where group_id = p_group and member_id = p_actor;

  perform public.d1_emit('d1-group:' || p_group, 'message', jsonb_build_object(
    'id', mid, 'groupId', p_group,
    'sender', jsonb_build_object('id', p_actor, 'displayName', sender_name),
    'body', nullif(btrim(coalesce(p_body, '')), ''),
    'replyTo', p_reply_to, 'attachmentId', p_attachment, 'content', p_content, 'createdAt', created));
  return mid;
end;
$$;

-- ── d1_vote: cast (or clear) a member's vote(s) on a poll message ───────────
-- p_option_ids is the member's full new vote set for this message (empty/null
-- clears it). Single-choice polls are enforced here, not just in the app.

create function public.d1_vote(p_actor uuid, p_message bigint, p_option_ids text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
  poll jsonb;
  allow_multiple boolean;
  valid_ids text[];
  tally jsonb;
  total_voters integer;
begin
  select group_id, content->'poll' into gid, poll
    from public.d1_messages where id = p_message and deleted_at is null;
  if gid is null or poll is null then
    raise exception 'That poll does not exist.' using errcode = 'P0002';
  end if;
  if not public.d1_is_current_member(gid, p_actor) then
    raise exception 'Only current members can vote.' using errcode = '42501';
  end if;
  if (select state from public.d1_groups where id = gid) <> 'active' then
    raise exception 'This group is frozen and read-only.' using errcode = 'P0001';
  end if;

  allow_multiple := coalesce((poll->>'allowMultiple')::boolean, false);
  select array_agg(value->>'id') into valid_ids from jsonb_array_elements(poll->'options');

  delete from public.d1_poll_votes where message_id = p_message and member_id = p_actor;

  if p_option_ids is not null and array_length(p_option_ids, 1) > 0 then
    if not (p_option_ids <@ coalesce(valid_ids, array[]::text[])) then
      raise exception 'That is not an option on this poll.' using errcode = '22023';
    end if;
    if not allow_multiple and array_length(p_option_ids, 1) > 1 then
      raise exception 'This poll only allows one choice.' using errcode = '22023';
    end if;
    insert into public.d1_poll_votes (message_id, member_id, option_id)
      select p_message, p_actor, unnest(p_option_ids);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('optionId', option_id, 'count', c)), '[]'::jsonb)
    into tally
    from (
      select option_id, count(*) as c
      from public.d1_poll_votes
      where message_id = p_message
      group by option_id
    ) counted;
  select count(distinct member_id) into total_voters from public.d1_poll_votes where message_id = p_message;

  perform public.d1_emit('d1-group:' || gid, 'poll_vote', jsonb_build_object(
    'messageId', p_message, 'votes', tally, 'totalVoters', coalesce(total_voters, 0)));
end;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────
-- Re-run the same least-privilege sweep the base migration uses, so the new
-- function is locked down the same way as every other d1_* function.

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'd1\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end;
$$;
