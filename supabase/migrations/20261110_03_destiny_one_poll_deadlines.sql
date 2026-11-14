-- Destiny One: poll deadlines and scheduled messages (1.2).
--
-- Builds on the jobs queue (20261110_01). Two things happen at a set time:
--
--   * a poll closes. Voting then stops (enforced here, in d1_vote, not just
--     hidden in the app), the poll shows "Closed", and DestinyAI replies under
--     it with the result. The closing is a 'close_poll' job; a poll can also be
--     closed early by hand, which cancels that job.
--   * a leader's scheduled message is sent. That is a 'send_message' job, run by
--     the API at the chosen time so every check runs again then (paused group,
--     leader suspended or gone, posting restriction, Announcements admin rule).
--     d1_post_scheduled_message() sends it at most once however often a job is
--     run, by tagging the message with the job that made it.
--
-- Message text and poll wording in a job's payload are sealed by the API, like
-- the message itself.

-- ── Columns ─────────────────────────────────────────────────────────────────
alter table public.d1_messages add column if not exists poll_closes_at timestamptz;
alter table public.d1_messages add column if not exists poll_closed_at timestamptz;
alter table public.d1_messages add column if not exists scheduled_job_id bigint;

alter table public.d1_messages drop constraint if exists d1_messages_poll_deadline_only_polls;
alter table public.d1_messages add constraint d1_messages_poll_deadline_only_polls
  check ((poll_closes_at is null and poll_closed_at is null) or coalesce(content ->> 'kind' = 'poll', false));

comment on column public.d1_messages.poll_closes_at is 'Polls: when voting stops. Null for no deadline.';
comment on column public.d1_messages.poll_closed_at is 'Polls: when voting actually stopped (at the deadline, or by hand).';
comment on column public.d1_messages.scheduled_job_id is 'The scheduled job that sent this message, so a repeated run never sends it twice.';

create unique index if not exists d1_messages_scheduled_job_idx
  on public.d1_messages (scheduled_job_id) where scheduled_job_id is not null;

-- One open deadline job per poll.
create unique index if not exists d1_scheduled_jobs_close_poll_idx
  on public.d1_scheduled_jobs (((payload ->> 'messageId')::bigint))
  where kind = 'close_poll' and status in ('pending', 'running');

-- ── Voting stops at the deadline ────────────────────────────────────────────
-- The same function as 20260928_02, with the closed check added after the
-- membership check.
create or replace function public.d1_vote(p_actor uuid, p_message bigint, p_option_ids text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gid uuid;
  poll jsonb;
  closes timestamptz;
  closed timestamptz;
  allow_multiple boolean;
  valid_ids text[];
  tally jsonb;
  total_voters integer;
begin
  select group_id, content->'poll', poll_closes_at, poll_closed_at into gid, poll, closes, closed
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
  if closed is not null or (closes is not null and closes <= now()) then
    raise exception 'This poll has closed.' using errcode = 'P0001';
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
    'messageId', p_message, 'groupId', gid, 'votes', tally, 'totalVoters', coalesce(total_voters, 0)));
end;
$$;

-- ── Setting a deadline ──────────────────────────────────────────────────────
-- Stamps the poll and queues the job that closes it. Safe to call again: the
-- unique index keeps it to one open job.
create or replace function public.d1_start_poll_deadline(p_message bigint, p_closes_at timestamptz, p_pin_result boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.d1_messages%rowtype;
begin
  select * into m from public.d1_messages where id = p_message and deleted_at is null;
  if not found or m.content ->> 'kind' is distinct from 'poll' then
    raise exception 'That poll does not exist.' using errcode = 'P0002';
  end if;
  if m.poll_closed_at is not null then
    return;
  end if;

  update public.d1_messages set poll_closes_at = p_closes_at where id = m.id;
  insert into public.d1_scheduled_jobs (kind, run_at, group_id, created_by, payload)
    values ('close_poll', p_closes_at, m.group_id, m.sender_id,
            jsonb_build_object('messageId', m.id, 'pinResult', coalesce(p_pin_result, false)))
    on conflict (((payload ->> 'messageId')::bigint)) where kind = 'close_poll' and status in ('pending', 'running')
    do nothing;
end;
$$;

-- ── Closing a poll ──────────────────────────────────────────────────────────
-- At the deadline (the job) or by hand. Closing twice does nothing the second
-- time: `newlyClosed` says whether this call did it, so the result is posted
-- once. A hand-closed poll's waiting deadline job is cancelled.
create or replace function public.d1_close_poll(p_message bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.d1_messages%rowtype;
  was_open boolean;
  tally jsonb;
  total integer;
begin
  select * into m from public.d1_messages where id = p_message for update;
  if not found or m.deleted_at is not null or m.content ->> 'kind' is distinct from 'poll' then
    raise exception 'That poll does not exist.' using errcode = 'P0002';
  end if;

  was_open := m.poll_closed_at is null;
  if was_open then
    update public.d1_messages set poll_closed_at = now() where id = m.id;
    update public.d1_scheduled_jobs
       set status = 'cancelled', finished_at = now()
     where kind = 'close_poll' and status = 'pending' and (payload ->> 'messageId')::bigint = m.id;
    perform public.d1_emit('d1-group:' || m.group_id, 'poll_closed', jsonb_build_object(
      'messageId', m.id, 'groupId', m.group_id, 'closedAt', now()));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('optionId', option_id, 'count', c) order by c desc, option_id), '[]'::jsonb)
    into tally
    from (select option_id, count(*) as c from public.d1_poll_votes where message_id = m.id group by option_id) counted;
  select count(distinct member_id) into total from public.d1_poll_votes where message_id = m.id;

  return jsonb_build_object(
    'groupId', m.group_id, 'senderId', m.sender_id, 'newlyClosed', was_open,
    'totalVoters', coalesce(total, 0), 'tally', tally);
end;
$$;

-- ── Sending a scheduled message ─────────────────────────────────────────────
-- d1_post_message, tagged with the job that asked for it. A job already
-- answered returns its message again with created = false, so a run that died
-- after sending but before recording is not sent twice. The insert triggers
-- still check membership, a paused group, the Announcements admin rule and any
-- posting restriction, exactly as for a message typed live.
create or replace function public.d1_post_scheduled_message(
  p_job bigint,
  p_actor uuid,
  p_group uuid,
  p_body text,
  p_attachment uuid,
  p_content jsonb,
  p_terms text[],
  p_mentions uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing bigint;
  mid bigint;
begin
  select id into existing from public.d1_messages where scheduled_job_id = p_job;
  if existing is not null then
    return jsonb_build_object('id', existing, 'created', false);
  end if;

  mid := public.d1_post_message(p_actor, p_group, p_body, null, p_attachment, p_content, p_terms, p_mentions, null);
  update public.d1_messages set scheduled_job_id = p_job where id = mid;
  return jsonb_build_object('id', mid, 'created', true);
end;
$$;

-- ── Cancelling with a reason ────────────────────────────────────────────────
-- A job that can never succeed (the group was paused, the leader left) is not
-- retried: it is cancelled, with the reason kept, and the leader is told.
create or replace function public.d1_cancel_job(p_id bigint, p_reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_status text;
begin
  update public.d1_scheduled_jobs
     set status = 'cancelled', last_error = left(p_reason, 500), finished_at = now()
   where id = p_id and status in ('pending', 'running')
  returning status into current_status;
  return coalesce(current_status, (select status from public.d1_scheduled_jobs where id = p_id), 'missing');
end;
$$;

revoke all on function public.d1_vote(uuid, bigint, text[]) from public, anon, authenticated;
grant execute on function public.d1_vote(uuid, bigint, text[]) to service_role;
revoke all on function public.d1_start_poll_deadline(bigint, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.d1_start_poll_deadline(bigint, timestamptz, boolean) to service_role;
revoke all on function public.d1_close_poll(bigint) from public, anon, authenticated;
grant execute on function public.d1_close_poll(bigint) to service_role;
revoke all on function public.d1_post_scheduled_message(bigint, uuid, uuid, text, uuid, jsonb, text[], uuid[]) from public, anon, authenticated;
grant execute on function public.d1_post_scheduled_message(bigint, uuid, uuid, text, uuid, jsonb, text[], uuid[]) to service_role;
revoke all on function public.d1_cancel_job(bigint, text) from public, anon, authenticated;
grant execute on function public.d1_cancel_job(bigint, text) to service_role;
