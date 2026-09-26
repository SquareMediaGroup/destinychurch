-- Destiny One safeguarding invariants, exercised against the real migration.
-- Run with: scripts/test-sql.sh   (needs a local Postgres 16 install)
--
-- Every statement runs in its own transaction, as each PostgREST RPC call
-- does, so the deferred membership triggers fire exactly as in production.

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
-- Fixed ids so the rest of the file can refer to people by name.

insert into auth.users (id, email, phone) values
  ('00000000-0000-0000-0000-00000000000a', 'lead@example.org', null),
  ('00000000-0000-0000-0000-00000000000b', 'adult2@example.org', null),
  ('00000000-0000-0000-0000-00000000000c', 'adult3@example.org', null),
  ('00000000-0000-0000-0000-00000000000d', 'minor1@example.org', null),
  ('00000000-0000-0000-0000-00000000000e', 'minor2@example.org', null),
  ('00000000-0000-0000-0000-00000000000f', 'phone@example.org', '+447700900000');

insert into public.d1_members (id, auth_user_id, display_name, adult_on, status, roles) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Lead Adult',   '1990-01-01', 'active', '{senior_leadership,group_leader}'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Second Adult', '1985-06-01', 'active', '{}'),
  ('10000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c', 'Third Adult',  '1980-03-03', 'active', '{}'),
  ('10000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000d', 'Minor One',    current_date + 400, 'active', '{}'),
  ('10000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000e', 'Minor Two',    null, 'active', '{}');

-- Shorthand used below.
\set lead   '''10000000-0000-0000-0000-00000000000a'''
\set adult2 '''10000000-0000-0000-0000-00000000000b'''
\set adult3 '''10000000-0000-0000-0000-00000000000c'''
\set minor1 '''10000000-0000-0000-0000-00000000000d'''
\set minor2 '''10000000-0000-0000-0000-00000000000e'''

-- ── Members ─────────────────────────────────────────────────────────────────

select pg_temp.check(public.d1_is_adult(:lead::uuid), 'adult_on in the past is an adult');
select pg_temp.check(not public.d1_is_adult(:minor1::uuid), 'adult_on in the future is a minor');
select pg_temp.check(not public.d1_is_adult(:minor2::uuid), 'no adult_on is a minor (fail safe)');

select pg_temp.expect_error(
  $$insert into public.d1_members (auth_user_id, display_name, adult_on, status)
    values ('00000000-0000-0000-0000-00000000000f', 'Has Phone', '1990-01-01', 'active')$$,
  'phone number');
select pg_temp.check(true, 'an auth user with a phone number cannot be activated');

select pg_temp.expect_error(
  $$update public.d1_members set roles = '{group_leader}' where id = '10000000-0000-0000-0000-00000000000d'$$,
  'verified adults');
select pg_temp.check(true, 'a minor cannot hold a leader role');

select pg_temp.check(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name like 'd1\_%'
      and (column_name ilike '%phone%' or column_name ilike '%mobile%'
           or column_name ilike '%telephone%' or column_name ilike '%birth%' or column_name = 'dob')
  ),
  'no d1_ table has a phone or date-of-birth column');

-- ── Community + announcements ───────────────────────────────────────────────

select pg_temp.expect_error(
  format($$select public.d1_create_community(%L, 'Nope')$$, :adult2), 'senior leadership');
select pg_temp.check(true, 'only senior leadership can create a community');

create temp table ids (k text primary key, v uuid);
insert into ids select 'community', public.d1_create_community(:lead::uuid, 'Destiny Church', 'Everyone');
insert into ids select 'announce', id from public.d1_groups
  where community_id = (select v from ids where k = 'community') and kind = 'announcements';

select pg_temp.check(
  (select state from public.d1_groups where id = (select v from ids where k = 'announce')) = 'frozen',
  'a new announcements group starts frozen until it has enough people');
select pg_temp.check(
  (select count(*) from public.d1_safeguarding_events) = 0,
  'an announcements group that never had enough people raises no safeguarding event');

select public.d1_add_community_members(:lead::uuid, (select v from ids where k = 'community'),
  array[:adult2, :adult3, :minor1, :minor2]::uuid[]);

select pg_temp.check(
  (select state from public.d1_groups where id = (select v from ids where k = 'announce')) = 'active',
  'announcements unfreezes once 3+ members and 2+ adults are in');

select pg_temp.expect_error(
  format($$select public.d1_post_message(%L, %L, 'hi')$$, :adult2, (select v from ids where k = 'announce')),
  'Only admins can post announcements');
select pg_temp.check(true, 'a non-admin cannot post an announcement');

select pg_temp.check(
  public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'Welcome!') > 0,
  'a community admin can post an announcement');

-- ── Group creation (rules 1–3) ──────────────────────────────────────────────

select pg_temp.expect_error(
  format($$select public.d1_create_group(%L, %L, 'x', null, null, array[%L, %L]::uuid[])$$,
    :adult2, (select v from ids where k = 'community'), :adult3, :minor1),
  'Only group leaders');
select pg_temp.check(true, 'a non-leader cannot create a group');

select pg_temp.expect_error(
  format($$select public.d1_create_group(%L, %L, 'x', null, null, array[%L]::uuid[])$$,
    :lead, (select v from ids where k = 'community'), :adult2),
  'at least 3 people');
select pg_temp.check(true, 'a two-person group (a 1:1 in disguise) is rejected');

select pg_temp.expect_error(
  format($$select public.d1_create_group(%L, %L, 'x', null, null, array[%L, %L]::uuid[])$$,
    :lead, (select v from ids where k = 'community'), :minor1, :minor2),
  'at least 2 verified adults');
select pg_temp.check(true, 'a group with only one adult is rejected');

insert into ids select 'youth', public.d1_create_group(:lead::uuid, (select v from ids where k = 'community'),
  'Youth Team', 'Youth', null, array[:adult2, :minor1, :minor2]::uuid[]);

select pg_temp.check(
  (select state from public.d1_groups where id = (select v from ids where k = 'youth')) = 'active',
  'a leader can create a group with 2 adults and 2 minors');

select pg_temp.expect_error(
  format($$select public.d1_add_group_members(%L, %L, array[%L]::uuid[], 'admin')$$,
    :lead, (select v from ids where k = 'youth'), :minor1),
  'Group admins must be verified adults');
select pg_temp.check(true, 'a minor cannot be made a group admin');

-- ── Freeze on breach, unfreeze on repair ────────────────────────────────────

select public.d1_post_message(:minor1::uuid, (select v from ids where k = 'youth'), 'hello');
select pg_temp.check(true, 'a minor can post in a group that satisfies the rule');

-- The second adult leaves: never blocked.
select public.d1_remove_group_member(:adult2::uuid, (select v from ids where k = 'youth'), :adult2::uuid);

select pg_temp.check(
  (select state || '/' || freeze_kind from public.d1_groups where id = (select v from ids where k = 'youth')) = 'frozen/auto',
  'the group freezes when it drops below 2 adults');
select pg_temp.check(
  exists (select 1 from public.d1_safeguarding_events
          where group_id = (select v from ids where k = 'youth') and kind = 'frozen' and adult_count = 1),
  'a safeguarding event is recorded with the adult count');
select pg_temp.check(
  exists (select 1 from public.notifications where roles = '{safeguarding_admin}' and kind = 'd1_frozen'),
  'the freeze reaches the admin notification bell');
select pg_temp.check(
  exists (select 1 from realtime.messages where topic = 'admin-notifications:safeguarding_admin'),
  'the freeze is broadcast to safeguarding admins');

select pg_temp.expect_error(
  format($$select public.d1_post_message(%L, %L, 'still there?')$$, :minor1, (select v from ids where k = 'youth')),
  'frozen');
select pg_temp.check(true, 'nobody can post in a frozen group');

select public.d1_add_group_members(:lead::uuid, (select v from ids where k = 'youth'), array[:adult3]::uuid[]);
select pg_temp.check(
  (select state from public.d1_groups where id = (select v from ids where k = 'youth')) = 'active',
  'adding a second adult unfreezes the group');
select pg_temp.check(
  exists (select 1 from public.d1_safeguarding_events
          where group_id = (select v from ids where k = 'youth') and kind = 'unfrozen'),
  'the unfreeze is logged');

-- Suspending an adult is also a breach.
update public.d1_members set status = 'suspended' where id = :adult3::uuid;
select pg_temp.check(
  (select state from public.d1_groups where id = (select v from ids where k = 'youth')) = 'frozen',
  'suspending an adult freezes their groups');
update public.d1_members set status = 'active' where id = :adult3::uuid;
select pg_temp.check(
  (select state from public.d1_groups where id = (select v from ids where k = 'youth')) = 'active',
  'reactivating them unfreezes it');

-- Manual freeze is not lifted by the automatic rule.
select public.d1_set_manual_freeze((select v from ids where k = 'youth'), true, 'Looking into a report', null);
select public.d1_evaluate_group((select v from ids where k = 'youth'));
select pg_temp.check(
  (select freeze_kind from public.d1_groups where id = (select v from ids where k = 'youth')) = 'manual',
  'a manual freeze survives re-evaluation');
select public.d1_set_manual_freeze((select v from ids where k = 'youth'), false, '', null);
select pg_temp.check(
  (select state from public.d1_groups where id = (select v from ids where k = 'youth')) = 'active',
  'lifting a manual freeze hands back to the automatic rule');

-- ── Messages ────────────────────────────────────────────────────────────────

insert into ids select 'msg', gen_random_uuid();
create temp table msg (id bigint);
insert into msg select public.d1_post_message(:adult3::uuid, (select v from ids where k = 'youth'), 'original');

select pg_temp.expect_error(
  $$update public.d1_messages set body = 'rewritten' where id = (select id from msg)$$,
  'cannot be edited');
select pg_temp.check(true, 'messages cannot be edited in place');

select pg_temp.expect_error(
  format($$select public.d1_delete_message(%L, %s)$$, :minor1, (select id from msg)),
  'cannot delete');
select pg_temp.check(true, 'a member cannot delete someone else''s message');

select public.d1_delete_message(:adult3::uuid, (select id from msg));
select pg_temp.check(
  (select body from public.d1_messages where id = (select id from msg)) = 'original'
    and (select deleted_at from public.d1_messages where id = (select id from msg)) is not null,
  'deleting a message keeps its content for safeguarding review');

select public.d1_report_message(:minor1::uuid,
  (select max(id) from public.d1_messages where group_id = (select v from ids where k = 'youth') and deleted_at is null),
  'This made me uncomfortable');
select pg_temp.check(
  exists (select 1 from public.notifications where kind = 'd1_report'),
  'a report reaches safeguarding');

select pg_temp.expect_error(
  format($$select public.d1_post_message(%L, %L, 'sneaky')$$, :adult2, (select v from ids where k = 'youth')),
  'current, active members');
select pg_temp.check(true, 'someone who left cannot post');

-- ── Overview ────────────────────────────────────────────────────────────────

select pg_temp.check(
  (select count(*) from public.d1_group_overview(:minor1::uuid)) = 2,
  'the overview lists every group a member is currently in');
-- The youth group's latest message is the one deleted above.
select pg_temp.check(
  (select last_body is null and last_deleted from public.d1_group_overview(:lead::uuid, (select v from ids where k = 'youth'))),
  'a deleted latest message gives no preview text');
select pg_temp.check(
  (select last_body from public.d1_group_overview(:minor1::uuid, (select v from ids where k = 'announce'))) = 'Welcome!',
  'the overview previews the latest message');
select pg_temp.check(
  (select unread_count from public.d1_group_overview(:minor1::uuid, (select v from ids where k = 'announce'))) = 1,
  'unread counts messages from others since joining');
select pg_temp.check(
  not exists (select 1 from public.d1_group_overview(:adult2::uuid, (select v from ids where k = 'youth'))),
  'someone who left no longer sees the group');

-- ── Realtime ────────────────────────────────────────────────────────────────

select pg_temp.check(
  exists (select 1 from realtime.messages
          where topic = 'd1-group:' || (select v from ids where k = 'youth') and event = 'message'),
  'posting broadcasts on the group topic');

select set_config('test.uid', '00000000-0000-0000-0000-00000000000d', false);
select pg_temp.check(public.d1_can_receive('d1-group:' || (select v from ids where k = 'youth')),
  'a current member can subscribe to their group');
select pg_temp.check(public.d1_can_receive('d1-member:10000000-0000-0000-0000-00000000000d'),
  'a member can subscribe to their own member topic');
select pg_temp.check(not public.d1_can_receive('d1-member:10000000-0000-0000-0000-00000000000a'),
  'a member cannot subscribe to someone else''s member topic');
select set_config('test.uid', '00000000-0000-0000-0000-00000000000b', false);
select pg_temp.check(not public.d1_can_receive('d1-group:' || (select v from ids where k = 'youth')),
  'someone who left can no longer subscribe');
select set_config('test.uid', '', false);
select pg_temp.check(not public.d1_can_receive('d1-group:' || (select v from ids where k = 'youth')),
  'a signed-out caller can subscribe to nothing');

-- ── Grants ──────────────────────────────────────────────────────────────────

select pg_temp.check(
  not has_function_privilege('authenticated', 'public.d1_post_message(uuid, uuid, text, bigint, uuid)', 'execute')
  and not has_function_privilege('anon', 'public.d1_create_group(uuid, uuid, text, text, text, uuid[])', 'execute')
  and has_function_privilege('service_role', 'public.d1_post_message(uuid, uuid, text, bigint, uuid)', 'execute'),
  'operation functions are callable by the service role only');

-- ── Erasure and retention ───────────────────────────────────────────────────

select public.d1_erase_member(:minor2::uuid);
select pg_temp.check(
  (select display_name = 'Former member' and status = 'deleted' and adult_on is null
     and churchsuite_contact_id is null from public.d1_members where id = :minor2::uuid),
  'erasure anonymises the member');
select pg_temp.check(
  not exists (select 1 from public.d1_group_members where member_id = :minor2::uuid and left_at is null),
  'erasure removes them from every group');

-- Rewind the clock on one member's messages. The immutability trigger would
-- (rightly) refuse this, so it's switched off for the fixture only.
alter table public.d1_messages disable trigger d1_messages_immutable;
update public.d1_messages set created_at = now() - interval '400 days'
  where sender_id = :minor1::uuid;
alter table public.d1_messages enable trigger d1_messages_immutable;

select pg_temp.check(
  (select messages_deleted from public.d1_purge_expired(365)) >= 1,
  'the retention purge deletes messages past the window');
select pg_temp.check(
  not exists (select 1 from public.d1_messages where sender_id = :minor1::uuid)
    and exists (select 1 from public.d1_messages where sender_id = :lead::uuid),
  'only messages older than the window are purged');
select pg_temp.check(
  not exists (select 1 from public.d1_members where id = :minor2::uuid),
  'an erased member with no remaining messages is removed entirely');

\echo 'All Destiny One SQL checks passed.'
