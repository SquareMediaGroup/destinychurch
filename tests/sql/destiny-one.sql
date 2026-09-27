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

-- Everyone here was verified by staff ('admin'): activation now requires it.
insert into public.d1_members (id, auth_user_id, display_name, adult_on, status, roles, verified_at, verification_source) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Lead Adult',   '1990-01-01', 'active', '{senior_leadership,group_leader}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Second Adult', '1985-06-01', 'active', '{}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c', 'Third Adult',  '1980-03-03', 'active', '{}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000d', 'Minor One',    current_date + 400, 'active', '{}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000e', 'Minor Two',    null, 'active', '{}', now(), 'admin');

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
  $$insert into public.d1_members (auth_user_id, display_name, adult_on, status, verified_at, verification_source)
    values ('00000000-0000-0000-0000-00000000000f', 'Has Phone', '1990-01-01', 'active', now(), 'admin')$$,
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
  exists (select 1 from public.notifications
          where roles = '{destiny_one_admin,safeguarding_admin}' and kind = 'd1_frozen'),
  'the freeze reaches Destiny One and safeguarding admins');
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
  exists (select 1 from public.notifications where kind = 'd1_report' and roles = '{safeguarding_admin}'),
  'a report reaches safeguarding admins only');

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

insert into public.d1_consents (member_id, document, version) values (:minor2::uuid, 'privacy', '2026-09');
update public.d1_members set avatar_url = '10000000-0000-0000-0000-00000000000e-1.jpeg' where id = :minor2::uuid;
select public.d1_erase_member(:minor2::uuid);
select pg_temp.check(
  not exists (select 1 from public.d1_consents where member_id = :minor2::uuid)
    and (select avatar_url is null from public.d1_members where id = :minor2::uuid),
  'erasure removes consent records and the profile picture reference');
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

-- One of those old messages is under an open report (Minor One reported it
-- above, and Minor One's messages are the ones being rewound, so make sure).
insert into public.d1_reports (message_id, group_id, reporter_id, reason)
  select m.id, m.group_id, :lead::uuid, 'Kept as evidence'
  from public.d1_messages m where m.sender_id = :minor1::uuid order by m.id limit 1;
create temp table reported as
  select message_id from public.d1_reports where reason = 'Kept as evidence';

select public.d1_purge_expired(365);
select pg_temp.check(
  exists (select 1 from public.d1_messages where id = (select message_id from reported)),
  'the retention purge keeps an old message while its report is open');

update public.d1_reports set status = 'closed'
  where message_id in (select m.id from public.d1_messages m where m.sender_id = :minor1::uuid);
select pg_temp.check(
  (select messages_deleted from public.d1_purge_expired(365)) >= 1,
  'the retention purge deletes messages past the window once their reports are closed');
select pg_temp.check(
  not exists (select 1 from public.d1_messages where sender_id = :minor1::uuid)
    and exists (select 1 from public.d1_messages where sender_id = :lead::uuid),
  'only messages older than the window are purged');
select pg_temp.check(
  not exists (select 1 from public.d1_members where id = :minor2::uuid),
  'an erased member with no remaining messages is removed entirely');

-- ════════════════════════════════════════════════════════════════════════════
-- Part 2: staff verification, invites, admin-path operations
-- ════════════════════════════════════════════════════════════════════════════

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000011', 'self@example.org'),
  ('00000000-0000-0000-0000-000000000012', 'invited@example.org'),
  ('00000000-0000-0000-0000-000000000013', 'kid@example.org'),
  ('00000000-0000-0000-0000-000000000014', 'staff@example.org');

select pg_temp.expect_error(
  $$insert into public.d1_members (auth_user_id, display_name, status)
    values ('00000000-0000-0000-0000-000000000011', 'Self Signup', 'active')$$,
  'verified before');
select pg_temp.check(true, 'nobody becomes active without a verification record');

-- A self-declared adult is pending, and even if activated by mistake without
-- adult_on, the declaration never counts.
insert into public.d1_members (id, auth_user_id, display_name, status, declared_adult_on, request_submitted_at)
  values ('20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011',
          'Self Signup', 'pending', '1990-01-01', now());
update public.d1_members set status = 'active', verified_at = now(), verification_source = 'admin'
  where id = '20000000-0000-0000-0000-000000000011';
select pg_temp.check(
  not public.d1_is_adult('20000000-0000-0000-0000-000000000011'),
  'a self-declared date of birth never makes someone an adult');

-- Invites
insert into public.d1_invites (email, display_name, is_adult, roles, community_ids, expires_at)
  values ('invited@example.org', 'Invited Adult', true, '{group_leader}',
          array[(select v from ids where k = 'community')], now() + interval '30 days');
insert into public.d1_invites (email, display_name, is_adult, adult_on, community_ids, expires_at)
  values ('kid@example.org', 'Invited Kid', false, current_date + 900,
          array[(select v from ids where k = 'community')], now() + interval '30 days');

select pg_temp.expect_error(
  $$insert into public.d1_invites (email, display_name, is_adult, roles, expires_at)
    values ('x@example.org', 'X', false, '{group_leader}', now() + interval '1 day')$$,
  'd1_invites_leaders_are_adults');
select pg_temp.check(true, 'an under-18 invite cannot carry a leader role');

select pg_temp.check(
  public.d1_accept_invite('00000000-0000-0000-0000-000000000099', 'nobody@example.org') is null,
  'signing in without an invite accepts nothing');

create temp table accepted (k text primary key, v uuid);
insert into accepted select 'adult', public.d1_accept_invite('00000000-0000-0000-0000-000000000012', ' Invited@Example.org ');
insert into accepted select 'kid', public.d1_accept_invite('00000000-0000-0000-0000-000000000013', 'kid@example.org');

select pg_temp.check(
  (select status = 'active' and verification_source = 'invite' and 'group_leader' = any (roles)
     from public.d1_members where id = (select v from accepted where k = 'adult')),
  'accepting an invite activates the member with its roles');
select pg_temp.check(public.d1_is_adult((select v from accepted where k = 'adult')),
  'an adult invite makes a verified adult');
select pg_temp.check(not public.d1_is_adult((select v from accepted where k = 'kid')),
  'an under-18 invite makes a minor');
select pg_temp.check(
  exists (select 1 from public.d1_community_members
          where member_id = (select v from accepted where k = 'kid')
            and community_id = (select v from ids where k = 'community')),
  'an accepted invite joins its communities');
select pg_temp.check(
  public.d1_accept_invite('00000000-0000-0000-0000-000000000012', 'invited@example.org') is null,
  'an invite can only be used once');

-- Admin-path operations still obey every rule.
select pg_temp.expect_error(
  format($$select public.d1_admin_create_group(%L, 'x', null, null, array[%L, %L]::uuid[])$$,
    (select v from ids where k = 'community'), :lead, :adult3),
  'at least 3 people');
select pg_temp.check(true, 'an admin-created group still needs 3 people');

select pg_temp.expect_error(
  format($$select public.d1_admin_create_group(%L, 'x', null, null, array[%L, %L, %L]::uuid[])$$,
    (select v from ids where k = 'community'), :lead,
    (select v from accepted where k = 'kid'), :minor1),
  'at least 2 verified adults');
select pg_temp.check(true, 'an admin-created group still needs 2 adults');

select pg_temp.expect_error(
  format($$select public.d1_admin_create_group(%L, 'x', null, null, array[%L, %L, %L]::uuid[], array[%L]::uuid[])$$,
    (select v from ids where k = 'community'), :lead, :adult3, :minor1, :minor1),
  'Group admins must be verified adults');
select pg_temp.check(true, 'an admin cannot make a minor a group admin');

insert into ids select 'media', public.d1_admin_create_group(
  (select v from ids where k = 'community'), 'Media Team', 'Media', null,
  array[:lead, :adult3, (select v from accepted where k = 'kid')]::uuid[],
  array[(select v from accepted where k = 'adult')]::uuid[]);
select pg_temp.check(
  (select state from public.d1_groups where id = (select v from ids where k = 'media')) = 'active'
    and (select role from public.d1_group_members
         where group_id = (select v from ids where k = 'media')
           and member_id = (select v from accepted where k = 'adult')) = 'admin',
  'an admin can create a valid group with a chosen group admin');

select public.d1_admin_remove_group_member((select v from ids where k = 'media'), :adult3::uuid);
select public.d1_admin_remove_group_member((select v from ids where k = 'media'), :lead::uuid);
select pg_temp.check(
  (select state from public.d1_groups where id = (select v from ids where k = 'media')) = 'frozen',
  'admin removals freeze a group that breaks the rule, same as anyone else');

insert into ids select 'staffcom', public.d1_admin_create_community('Staff', null, '{}');
select pg_temp.check(
  (select state from public.d1_groups where community_id = (select v from ids where k = 'staffcom') and kind = 'announcements') = 'frozen',
  'an admin-created community starts with its announcements paused until people join');

select pg_temp.check(
  (select member_count from public.d1_admin_groups((select v from ids where k = 'community'))
     where id = (select v from ids where k = 'youth')) >= 3,
  'the admin group list reports live counts');
select pg_temp.check(
  (select email from public.d1_admin_members() where id = :lead::uuid) = 'lead@example.org',
  'the admin member list includes the sign-in email');

select pg_temp.check(
  not has_function_privilege('authenticated', 'public.d1_admin_create_group(uuid, text, text, text, uuid[], uuid[])', 'execute')
  and not has_function_privilege('authenticated', 'public.d1_accept_invite(uuid, text)', 'execute')
  and not has_function_privilege('anon', 'public.d1_admin_members(text)', 'execute')
  and has_function_privilege('authenticated', 'public.d1_can_receive(text)', 'execute'),
  'admin functions are service-role only; the realtime helpers stay open');

-- ── Leader invites (part 3) ─────────────────────────────────────────────────

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ee', 'invited@example.org');
insert into public.d1_invites (email, display_name, is_adult, community_ids, group_ids, needs_approval, invited_by_member, expires_at)
  values ('invited@example.org', 'Invited Person', true,
          array[(select v from ids where k = 'community')]::uuid[], array[(select v from ids where k = 'youth')]::uuid[],
          true, :lead::uuid, now() + interval '7 days');
select public.d1_accept_invite('00000000-0000-0000-0000-0000000000ee'::uuid, 'invited@example.org');
select pg_temp.check(
  (select status = 'pending' and adult_on is null and verified_at is null and request_submitted_at is not null
          and request_group_ids = array[(select v from ids where k = 'youth')]::uuid[]
          and request_note like 'Invited by Lead Adult to %(leader says: adult)%'
   from public.d1_members where auth_user_id = '00000000-0000-0000-0000-0000000000ee'),
  'a leader invite becomes an access request, never an active or age-verified account');
select pg_temp.check(
  not exists (select 1 from public.d1_group_members gm join public.d1_members m on m.id = gm.member_id
              where m.auth_user_id = '00000000-0000-0000-0000-0000000000ee'),
  'a leader invite joins no group or community until staff approve');
select pg_temp.expect_error(
  $$insert into public.d1_invites (email, display_name, roles, needs_approval, expires_at)
    values ('x@example.org', 'X', '{group_leader}', true, now() + interval '1 day')$$,
  'd1_invites_leader_invites_no_roles');
select pg_temp.check(true, 'a leader invite cannot grant leader roles');

-- ── Invited members exist before sign-in (part 5) ───────────────────────────

insert into public.d1_invites (id, email, display_name, is_adult, community_ids, expires_at)
  values ('20000000-0000-0000-0000-0000000000aa', 'early@example.org', 'Early Bird', true,
          array[(select v from ids where k = 'community')]::uuid[], now() + interval '7 days');
select public.d1_invite_create_member('20000000-0000-0000-0000-0000000000aa');
select pg_temp.check(
  (select m.status = 'active' and m.auth_user_id is null and m.verification_source = 'invite'
   from public.d1_members m join public.d1_invites i on i.member_id = m.id
   where i.id = '20000000-0000-0000-0000-0000000000aa'),
  'a staff invite creates an active, staff-verified member with no login yet');
select pg_temp.check(
  exists (select 1 from public.d1_community_members cm join public.d1_invites i on i.member_id = cm.member_id
          where i.id = '20000000-0000-0000-0000-0000000000aa'),
  'the invited member is in the invite''s communities straight away');
select pg_temp.check(public.d1_sign_in_status('Early@Example.org ') = 'invite', 'an open invite can sign in');
select pg_temp.check(public.d1_sign_in_status('lead@example.org') = 'member', 'an existing member can sign in');
update public.d1_settings set allow_access_requests = false;
select pg_temp.check(public.d1_sign_in_status('nobody@example.org') = 'none', 'invite-only: an unknown email is turned away');
update public.d1_settings set allow_access_requests = true;
select pg_temp.check(public.d1_sign_in_status('nobody@example.org') = 'request', 'requests open: an unknown email may request access');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ab', 'early@example.org');
-- A sign-in from before the invite left a pending row; it gets folded in.
insert into public.d1_members (auth_user_id, display_name, status) values ('00000000-0000-0000-0000-0000000000ab', 'New sign-in', 'pending');
select pg_temp.check(
  public.d1_accept_invite('00000000-0000-0000-0000-0000000000ab'::uuid, 'early@example.org')
    = (select member_id from public.d1_invites where id = '20000000-0000-0000-0000-0000000000aa'),
  'signing in links the login to the member created at invite time');
select pg_temp.check(
  (select count(*) from public.d1_members where auth_user_id = '00000000-0000-0000-0000-0000000000ab') = 1,
  'the earlier pending row is folded in, not left behind');

-- ── Message search (part 4) ─────────────────────────────────────────────────

create temp table found (k text primary key, v bigint);
insert into found select 'early', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'Run sheet from before');
-- Pretend Lead joined after that message was sent.
update public.d1_group_members set joined_at = clock_timestamp()
  where group_id = (select v from ids where k = 'announce') and member_id = :lead::uuid;
insert into found select 'live', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'Sunday run sheet is ready');
insert into found select 'gone', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'Old run sheet, ignore');
select public.d1_delete_message(:lead::uuid, (select v from found where k = 'gone'));

select pg_temp.check(
  exists (select 1 from public.d1_search_messages(:lead::uuid, 'run:* & sheet:*') where id = (select v from found where k = 'live')),
  'search finds a message in a group you are in');
select pg_temp.check(
  not exists (select 1 from public.d1_search_messages(:lead::uuid, 'run:* & sheet:*') where id = (select v from found where k = 'gone')),
  'search never returns a deleted message');
select pg_temp.check(
  not exists (select 1 from public.d1_search_messages(:lead::uuid, 'run:* & sheet:*') where id = (select v from found where k = 'early')),
  'search never returns messages from before you joined');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ff', 'outsider@example.org');
insert into public.d1_members (id, auth_user_id, display_name, adult_on, status, verified_at, verification_source) values
  ('10000000-0000-0000-0000-0000000000ff', '00000000-0000-0000-0000-0000000000ff', 'Outsider', '1990-01-01', 'active', now(), 'admin');
select pg_temp.check(
  (select count(*) from public.d1_search_messages('10000000-0000-0000-0000-0000000000ff'::uuid, 'run:* & sheet:*')) = 0,
  'search finds nothing in groups you are not in');
select pg_temp.check(
  (select count(*) from public.d1_search_messages(:lead::uuid, 'run & | ! (')) = 0,
  'a malformed query finds nothing instead of erroring');
select pg_temp.check(
  not has_function_privilege('authenticated', 'public.d1_search_messages(uuid, text, integer)', 'execute'),
  'message search is service-role only');

-- ── Private profile pictures (part 6) ───────────────────────────────────────

select pg_temp.check(
  (select not public from storage.buckets where id = 'd1-avatars'),
  'the profile picture bucket is private');

-- ── Blocking (part 6) ───────────────────────────────────────────────────────

insert into found select 'blocked', public.d1_post_message(:adult3::uuid, (select v from ids where k = 'youth'), 'zebra crossing notice');
select pg_temp.check(
  (select last_id from public.d1_group_overview(:minor1::uuid, (select v from ids where k = 'youth'))) = (select v from found where k = 'blocked'),
  'before blocking, the message is the chat list preview');
create temp table unread_before as
  select unread_count as v from public.d1_group_overview(:minor1::uuid, (select v from ids where k = 'youth'));
select public.d1_set_block(:minor1::uuid, :adult3::uuid, true);
select pg_temp.check(
  (select last_id is distinct from (select v from found where k = 'blocked')
     from public.d1_group_overview(:minor1::uuid, (select v from ids where k = 'youth'))),
  'a blocked person''s message is not the chat list preview');
select pg_temp.check(
  (select unread_count from public.d1_group_overview(:minor1::uuid, (select v from ids where k = 'youth')))
    < (select v from unread_before),
  'a blocked person''s messages do not count as unread');
select pg_temp.check(
  not exists (select 1 from public.d1_search_messages(:minor1::uuid, 'zebra:*')),
  'search never returns a blocked person''s messages');
select pg_temp.check(
  exists (select 1 from public.d1_search_messages(:lead::uuid, 'zebra:*')),
  'blocking only hides messages for the person who blocked');
select pg_temp.check(
  public.d1_is_current_member((select v from ids where k = 'youth'), :adult3::uuid)
    and (select state from public.d1_groups where id = (select v from ids where k = 'youth')) = 'active',
  'blocking removes nobody from the group, so the 2-adult rule is untouched');
select pg_temp.check(
  exists (select 1 from public.d1_safeguarding_events where kind = 'block' and detail = 'Minor One blocked Third Adult.'),
  'a block is logged for safeguarding');
select pg_temp.check(
  not exists (select 1 from public.notifications where kind = 'd1_block'),
  'a block does not ring the admin bell');
select pg_temp.expect_error(
  format($$select public.d1_set_block(%L, %L, true)$$, :minor1, :minor1),
  'block yourself');
select pg_temp.check(true, 'you cannot block yourself');
select public.d1_set_block(:minor1::uuid, :adult3::uuid, false);
select pg_temp.check(
  exists (select 1 from public.d1_search_messages(:minor1::uuid, 'zebra:*'))
    and exists (select 1 from public.d1_safeguarding_events where kind = 'unblock'),
  'unblocking shows their messages again, and is logged');
select pg_temp.check(
  not has_function_privilege('authenticated', 'public.d1_set_block(uuid, uuid, boolean)', 'execute'),
  'blocking is service-role only');

-- ── Safeguarding takedown (part 6) ──────────────────────────────────────────

select public.d1_admin_delete_message((select v from found where k = 'blocked'), null);
select pg_temp.check(
  (select deleted_at is not null and body = 'zebra crossing notice' and deleted_by is null
     from public.d1_messages where id = (select v from found where k = 'blocked')),
  'a safeguarding takedown hides the message but keeps its content for review');
select pg_temp.check(
  exists (select 1 from realtime.messages where event = 'message_deleted'
          and (payload->>'id')::bigint = (select v from found where k = 'blocked')),
  'a safeguarding takedown removes it from members'' screens live');
select pg_temp.check(
  not has_function_privilege('authenticated', 'public.d1_admin_delete_message(bigint, uuid)', 'execute'),
  'the takedown function is service-role only');

-- ── Polls (part 7) ──────────────────────────────────────────────────────────

insert into found select 'poll', public.d1_post_message(:adult3::uuid, (select v from ids where k = 'youth'), null, null, null,
  '{"kind":"poll","poll":{"id":"p1","question":"Pizza or pasta?","options":[{"id":"o1","label":"Pizza"},{"id":"o2","label":"Pasta"}],"allowMultiple":false}}'::jsonb);
select pg_temp.check(
  (select body is null and content->>'kind' = 'poll' from public.d1_messages where id = (select v from found where k = 'poll')),
  'a poll is a message with content and no body');
select public.d1_vote(:minor1::uuid, (select v from found where k = 'poll'), array['o1']);
select public.d1_vote(:minor1::uuid, (select v from found where k = 'poll'), array['o2']);
select pg_temp.check(
  (select array_agg(option_id) from public.d1_poll_votes where message_id = (select v from found where k = 'poll')) = array['o2'],
  'changing a vote replaces it');
select pg_temp.check(
  exists (select 1 from realtime.messages where event = 'poll_vote'
          and (payload->>'messageId')::bigint = (select v from found where k = 'poll')
          and payload->>'groupId' = (select v from ids where k = 'youth')::text),
  'votes are broadcast live with the group id');
select pg_temp.expect_error(
  format($$select public.d1_vote(%L, %L, array['o1','o2'])$$, :minor1, (select v from found where k = 'poll')),
  'only allows one choice');
select pg_temp.check(true, 'single-choice polls take one choice');
select pg_temp.expect_error(
  format($$select public.d1_vote(%L, %L, array['nope'])$$, :minor1, (select v from found where k = 'poll')),
  'not an option');
select pg_temp.check(true, 'you can only vote for options on the poll');
select pg_temp.expect_error(
  format($$select public.d1_vote(%L, %L, array['o1'])$$, :adult2, (select v from found where k = 'poll')),
  'current members');
select pg_temp.check(true, 'only current members can vote');
select pg_temp.check(
  not has_function_privilege('authenticated', 'public.d1_vote(uuid, bigint, text[])', 'execute'),
  'voting is service-role only');

\echo 'All Destiny One SQL checks passed.'
