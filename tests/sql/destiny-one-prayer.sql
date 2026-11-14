-- Prayer requests (migration 20261112_01_destiny_one_prayer_requests.sql).
-- Run with: scripts/test-sql.sh destiny-one-prayer
-- Sealed values are stand-ins with the d1e: prefix, as in destiny-one-encryption.sql.

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

-- ── Posting ─────────────────────────────────────────────────────────────────
select pg_temp.expect_error(
  format($$select public.d1_post_message(%L, %L, null, null, null, '{"kind":"prayer","prayer":{"text":"My mum is in hospital"}}'::jsonb)$$,
    :lead, (select v from ids where k = 'announce')),
  'd1_messages_prayer_sealed');
select pg_temp.check(true, 'a prayer request with plain text is refused');

insert into found select 'prayer', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), null, null, null,
  '{"kind":"prayer","prayer":{"text":"d1e:v1:mum.hospital"}}'::jsonb);
insert into found select 'text', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'd1e:v1:hello.there', null, null, null);
select pg_temp.check(
  (select group_id = (select v from ids where k = 'announce') and member_id = :lead::uuid and answered_at is null
     from public.d1_prayer_requests where message_id = (select v from found where k = 'prayer')),
  'a prayer message gets its request row');
select pg_temp.check((select count(*) from public.d1_prayer_requests) = 1, 'an ordinary message does not');

-- ── Browser keys get nothing ────────────────────────────────────────────────
set role authenticated;
select pg_temp.expect_error('select * from public.d1_prayer_requests', 'permission denied');
select pg_temp.expect_error('select * from public.d1_prayer_taps', 'permission denied');
select pg_temp.expect_error('select public.d1_pray(null, 1, true)', 'permission denied');
select pg_temp.expect_error('select public.d1_answer_prayer(null, 1, null)', 'permission denied');
select pg_temp.expect_error('select * from public.d1_prayer_summary_due()', 'permission denied');
reset role;
select pg_temp.check(true, 'prayer tables and functions are closed to browser keys');

-- ── I prayed ────────────────────────────────────────────────────────────────
select pg_temp.check(public.d1_pray(:adult2::uuid, (select v from found where k = 'prayer'), true) = 1, 'a member taps I prayed');
select pg_temp.check(public.d1_pray(:adult2::uuid, (select v from found where k = 'prayer'), true) = 1, 'tapping twice counts once');
select pg_temp.check(public.d1_pray(:adult3::uuid, (select v from found where k = 'prayer'), true) = 2, 'a second member makes two');
select pg_temp.check(public.d1_pray(:adult3::uuid, (select v from found where k = 'prayer'), false) = 1, 'and can take it back');
select pg_temp.expect_error(
  format($$select public.d1_pray(%L, %s, true)$$, :lead, (select v from found where k = 'prayer')), 'your own request');
select pg_temp.expect_error(
  format($$select public.d1_pray(%L, %s, true)$$, :adult2, (select v from found where k = 'text')), 'does not exist');
select pg_temp.expect_error(
  $$select public.d1_pray('99999999-0000-0000-0000-000000000000', $$ || (select v from found where k = 'prayer') || $$, true)$$, 'Only current members');
select pg_temp.check(true, 'not your own request, not an ordinary message, not from outside the group');
select pg_temp.check(
  (select payload ->> 'count' = '1' and payload ? 'memberId' = false from realtime.messages where event = 'prayer_tap' order by id desc limit 1),
  'the group hears the count, never who');

-- ── The daily summary ───────────────────────────────────────────────────────
select pg_temp.check((select count(*) from public.d1_prayer_summary_due()) = 0, 'nobody gets a summary unless they opted in');
update public.d1_members set prayer_summary = true where id = :lead::uuid;
select pg_temp.check((select people from public.d1_prayer_summary_due() where member_id = :lead::uuid) = 1, 'an opted-in member is told how many people prayed');
update public.d1_prayer_taps set created_at = now() - interval '2 days';
select pg_temp.check((select count(*) from public.d1_prayer_summary_due()) = 0, 'only taps from the last 24 hours count');
update public.d1_prayer_taps set created_at = now();

-- ── Answered ────────────────────────────────────────────────────────────────
select pg_temp.expect_error(
  format($$select public.d1_answer_prayer(%L, %s, null)$$, :adult2, (select v from found where k = 'prayer')), 'Only the person who asked');
select pg_temp.expect_error(
  format($$select public.d1_answer_prayer(%L, %s, 'She is home')$$, :lead, (select v from found where k = 'prayer')), 'answer_update');
select pg_temp.check(true, 'only the author can mark it answered, and the update must be sealed');
select pg_temp.check(
  public.d1_answer_prayer(:lead::uuid, (select v from found where k = 'prayer'), 'd1e:v1:she.is.home') = (select v from ids where k = 'announce'),
  'the author marks it answered');
select pg_temp.check(
  (select answered_at is not null and answer_update = 'd1e:v1:she.is.home' from public.d1_prayer_requests where message_id = (select v from found where k = 'prayer')),
  'with the update kept');
select pg_temp.expect_error(
  format($$select public.d1_answer_prayer(%L, %s, null)$$, :lead, (select v from found where k = 'prayer')), 'already marked answered');
select pg_temp.check(public.d1_pray(:adult3::uuid, (select v from found where k = 'prayer'), true) = 2, 'people can still pray for an answered request');

-- ── Deleted and purged ──────────────────────────────────────────────────────
update public.d1_messages set deleted_at = now() where id = (select v from found where k = 'prayer');
select pg_temp.expect_error(
  format($$select public.d1_pray(%L, %s, true)$$, :adult2, (select v from found where k = 'prayer')), 'does not exist');
select pg_temp.check((select count(*) from public.d1_prayer_summary_due()) = 0, 'a deleted request is left out of the summary');
delete from public.d1_messages where id = (select v from found where k = 'prayer');
select pg_temp.check((select count(*) from public.d1_prayer_requests) = 0 and (select count(*) from public.d1_prayer_taps) = 0,
  'when the message is purged its request and taps go with it');
