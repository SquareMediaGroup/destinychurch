-- Poll deadlines and scheduled messages (migration 20261110_03_destiny_one_poll_deadlines.sql),
-- on top of the jobs queue (20261110_01).
-- Run with: scripts/test-sql.sh destiny-one-scheduled-sends
--
-- Built on the encryption migrations, so sealed values are stand-ins with the
-- d1e: prefix, as in destiny-one-encryption.sql.

\set ON_ERROR_STOP on
set client_min_messages = warning;

create or replace function pg_temp.expect_error(stmt text, fragment text)
returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'EXPECTED FAILURE did not happen: %', stmt;
exception when others then
  if sqlerrm like 'EXPECTED FAILURE%' then raise; end if;
  if position(fragment in sqlerrm) = 0 then
    raise exception 'Wrong error for %: got "%", wanted "%"', stmt, sqlerrm, fragment;
  end if;
end;
$$;

create or replace function pg_temp.check(ok boolean, label text)
returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then
    raise exception 'FAILED: %', label;
  end if;
  raise notice 'ok - %', label;
end;
$$;

set client_min_messages = notice;

-- ── Fixture ─────────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'lead@example.org'),
  ('00000000-0000-0000-0000-00000000000b', 'adult2@example.org'),
  ('00000000-0000-0000-0000-00000000000c', 'adult3@example.org');

insert into public.d1_members (id, auth_user_id, display_name, adult_on, status, roles, verified_at, verification_source) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Lead Adult',   '1990-01-01', 'active', '{senior_leader}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Second Adult', '1985-06-01', 'active', '{}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c', 'Third Adult',  '1980-03-03', 'active', '{}', now(), 'admin');

\set lead   '''10000000-0000-0000-0000-00000000000a'''
\set adult2 '''10000000-0000-0000-0000-00000000000b'''
\set adult3 '''10000000-0000-0000-0000-00000000000c'''

create temp table ids (k text primary key, v uuid);
insert into ids select 'community', public.d1_create_community(:lead::uuid, 'Destiny Church', 'Everyone');
insert into ids select 'announce', id from public.d1_groups
  where community_id = (select v from ids where k = 'community') and kind = 'announcements';
select public.d1_add_community_members(:lead::uuid, (select v from ids where k = 'community'),
  array['10000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000c']::uuid[]);

create temp table found (k text primary key, v bigint);

-- A poll, as the API sends it (sealed wording, plain option ids).
insert into found select 'poll', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), null, null, null,
  '{"kind":"poll","poll":{"id":"p","question":"d1e:v1:q.q","options":[{"id":"o1","label":"d1e:v1:a.b"},{"id":"o2","label":"d1e:v1:c.d"}]}}'::jsonb);
insert into found select 'text', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'd1e:v1:hello.there', null, null, null);

-- ── Browser keys get nothing ────────────────────────────────────────────────
set role authenticated;
select pg_temp.expect_error('select public.d1_close_poll(1)', 'permission denied');
select pg_temp.expect_error('select public.d1_start_poll_deadline(1, now(), false)', 'permission denied');
select pg_temp.expect_error('select public.d1_cancel_job(1, ''x'')', 'permission denied');
select pg_temp.expect_error($$select public.d1_post_scheduled_message(1, null, null, null, null, null, null, null)$$, 'permission denied');
reset role;
select pg_temp.check(true, 'the new functions are not callable from a browser key');

-- ── A deadline ──────────────────────────────────────────────────────────────
select public.d1_start_poll_deadline((select v from found where k = 'poll'), now() + interval '1 hour', true);
select pg_temp.check((select poll_closes_at > now() from public.d1_messages where id = (select v from found where k = 'poll')), 'a deadline is stamped on the poll');
select pg_temp.check(
  (select count(*) from public.d1_scheduled_jobs where kind = 'close_poll' and status = 'pending'
     and (payload ->> 'messageId')::bigint = (select v from found where k = 'poll')) = 1,
  'and a close job is queued for it');
select pg_temp.check(
  (select (payload ->> 'pinResult')::boolean and run_at > now() from public.d1_scheduled_jobs where kind = 'close_poll'),
  'which remembers to pin the result and runs at the deadline');

select public.d1_start_poll_deadline((select v from found where k = 'poll'), now() + interval '1 hour', true);
select pg_temp.check((select count(*) from public.d1_scheduled_jobs where kind = 'close_poll') = 1, 'asking again does not queue a second close job');

select pg_temp.expect_error(
  format($$select public.d1_start_poll_deadline(%s, now() + interval '1 hour', false)$$, (select v from found where k = 'text')),
  'does not exist');
select pg_temp.expect_error(
  format($$update public.d1_messages set poll_closes_at = now() where id = %s$$, (select v from found where k = 'text')),
  'd1_messages_poll_deadline_only_polls');
select pg_temp.check(true, 'only a poll can have a deadline');

-- ── Voting until the deadline ───────────────────────────────────────────────
select public.d1_vote(:adult2::uuid, (select v from found where k = 'poll'), array['o2']);
select public.d1_vote(:adult3::uuid, (select v from found where k = 'poll'), array['o2']);
select public.d1_vote(:lead::uuid, (select v from found where k = 'poll'), array['o1']);
select pg_temp.check((select count(*) from public.d1_poll_votes where message_id = (select v from found where k = 'poll')) = 3, 'votes are taken before the deadline');

-- The clock passes the deadline before the closing job has run: the database refuses anyway.
update public.d1_messages set poll_closes_at = now() - interval '1 second' where id = (select v from found where k = 'poll');
select pg_temp.expect_error(
  format($$select public.d1_vote(%L, %s, array['o1'])$$, :adult2, (select v from found where k = 'poll')),
  'This poll has closed');
select pg_temp.check(true, 'a vote after the deadline is refused by the database, not just hidden in the app');
select pg_temp.check(
  (select option_id from public.d1_poll_votes where member_id = :adult2::uuid and message_id = (select v from found where k = 'poll')) = 'o2',
  'and the earlier vote is left as it was');
update public.d1_messages set poll_closes_at = now() + interval '1 hour' where id = (select v from found where k = 'poll');

-- ── Closing ─────────────────────────────────────────────────────────────────
create temp table closed1 as select public.d1_close_poll((select v from found where k = 'poll')) as r;
select pg_temp.check((select (r ->> 'newlyClosed')::boolean from closed1), 'closing a poll says it was newly closed');
select pg_temp.check((select (r ->> 'totalVoters')::int from closed1) = 3, 'and counts the voters');
select pg_temp.check((select r -> 'tally' -> 0 ->> 'optionId' from closed1) = 'o2' and (select (r -> 'tally' -> 0 ->> 'count')::int from closed1) = 2, 'and lists the winner first');
select pg_temp.check((select poll_closed_at is not null from public.d1_messages where id = (select v from found where k = 'poll')), 'the poll is stamped closed');
select pg_temp.check(
  (select status from public.d1_scheduled_jobs where kind = 'close_poll') = 'cancelled',
  'closing by hand cancels the waiting deadline job');
select pg_temp.expect_error(
  format($$select public.d1_vote(%L, %s, array['o1'])$$, :adult2, (select v from found where k = 'poll')),
  'This poll has closed');
select pg_temp.check(true, 'a closed poll takes no more votes');

create temp table closed2 as select public.d1_close_poll((select v from found where k = 'poll')) as r;
select pg_temp.check(not (select (r ->> 'newlyClosed')::boolean from closed2), 'closing again is not newly closed, so the result is posted once');

select public.d1_start_poll_deadline((select v from found where k = 'poll'), now() + interval '1 day', false);
select pg_temp.check((select count(*) from public.d1_scheduled_jobs where kind = 'close_poll' and status = 'pending') = 0, 'a closed poll gets no new deadline');
select pg_temp.expect_error($$select public.d1_close_poll(-1)$$, 'does not exist');

-- ── A deadline that arrives through the queue ───────────────────────────────
insert into found select 'poll2', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), null, null, null,
  '{"kind":"poll","poll":{"id":"p2","question":"d1e:v1:q.q","options":[{"id":"o1","label":"d1e:v1:a.b"},{"id":"o2","label":"d1e:v1:c.d"}]}}'::jsonb);
select public.d1_start_poll_deadline((select v from found where k = 'poll2'), now() - interval '1 minute', false);
create temp table claimed as select * from public.d1_claim_due_jobs(10);
select pg_temp.check((select count(*) from claimed where kind = 'close_poll') = 1, 'a deadline that has passed is claimed by the runner');
select pg_temp.check((select (public.d1_close_poll((select v from found where k = 'poll2')) ->> 'newlyClosed')::boolean), 'and closing it from the job works');
select pg_temp.check((select public.d1_finish_job((select id from claimed where kind = 'close_poll'), null)) = 'done', 'and the job finishes done (it was running, so closing did not cancel it)');

-- ── Scheduled messages ──────────────────────────────────────────────────────
insert into public.d1_scheduled_jobs (id, kind, run_at, group_id, created_by, payload, status)
  overriding system value
  values (9001, 'send_message', now(), (select v from ids where k = 'announce'), :lead::uuid, '{}', 'running');

create temp table sent1 as select public.d1_post_scheduled_message(
  9001, :lead::uuid, (select v from ids where k = 'announce'), 'd1e:v1:see.you', null, null, array[md5('see')], null) as r;
select pg_temp.check((select (r ->> 'created')::boolean from sent1), 'a scheduled message is sent');
select pg_temp.check(
  (select scheduled_job_id from public.d1_messages where id = (select (r ->> 'id')::bigint from sent1)) = 9001
  and (select sender_id from public.d1_messages where id = (select (r ->> 'id')::bigint from sent1)) = :lead::uuid,
  'in the leader''s name, tagged with the job');

create temp table sent2 as select public.d1_post_scheduled_message(
  9001, :lead::uuid, (select v from ids where k = 'announce'), 'd1e:v1:see.you', null, null, array[md5('see')], null) as r;
select pg_temp.check(not (select (r ->> 'created')::boolean from sent2) and (select r ->> 'id' from sent2) = (select r ->> 'id' from sent1), 'running the same job again returns the same message');
select pg_temp.check((select count(*) from public.d1_messages where scheduled_job_id = 9001) = 1, 'and never sends it twice');

-- The checks still run at send time.
select pg_temp.expect_error(
  format($$select public.d1_post_scheduled_message(9002, %L, %L, 'd1e:v1:x.y', null, null, null, null)$$, :adult2, (select v from ids where k = 'announce')),
  'Only admins can post announcements');
select pg_temp.check(true, 'a member who is not an admin cannot send into Announcements, even by schedule');

update public.d1_group_members set left_at = now() where group_id = (select v from ids where k = 'announce') and member_id = :lead::uuid;
select pg_temp.expect_error(
  format($$select public.d1_post_scheduled_message(9003, %L, %L, 'd1e:v1:x.y', null, null, null, null)$$, :lead, (select v from ids where k = 'announce')),
  'frozen and read-only');
select pg_temp.check(true, 'a group that was frozen after scheduling (here, its only admin left) refuses the send');
update public.d1_group_members set left_at = null where group_id = (select v from ids where k = 'announce') and member_id = :lead::uuid;

-- ── Cancelling with a reason ────────────────────────────────────────────────
insert into public.d1_scheduled_jobs (id, kind, run_at, payload) overriding system value values
  (9101, 'send_message', now() + interval '1 hour', '{}'),
  (9102, 'send_message', now() - interval '1 hour', '{}');
update public.d1_scheduled_jobs set status = 'running' where id = 9102;
select pg_temp.check(public.d1_cancel_job(9101, 'The group was paused.') = 'cancelled', 'a waiting job can be cancelled');
select pg_temp.check((select last_error from public.d1_scheduled_jobs where id = 9101) = 'The group was paused.', 'with the reason kept');
select pg_temp.check(public.d1_cancel_job(9102, 'Leader suspended.') = 'cancelled', 'a running job can be cancelled');
select pg_temp.check(public.d1_cancel_job(9102, 'again') = 'cancelled', 'cancelling twice changes nothing');
select pg_temp.check((select last_error from public.d1_scheduled_jobs where id = 9102) = 'Leader suspended.', 'and keeps the first reason');
select pg_temp.check((select count(*) from public.d1_claim_due_jobs(10) where id in (9101, 9102)) = 0, 'a cancelled job is never claimed');
select pg_temp.check(public.d1_cancel_job(-5, 'x') = 'missing', 'cancelling a job that does not exist says so');
