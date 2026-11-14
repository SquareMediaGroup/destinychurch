-- Discover groups (migration 20261112_02_destiny_one_discover_groups.sql).
-- Run with: scripts/test-sql.sh destiny-one-discover


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
  ('00000000-0000-0000-0000-00000000000c', 'adult3@example.org'),
  ('00000000-0000-0000-0000-00000000000d', 'minor1@example.org'),
  ('00000000-0000-0000-0000-00000000000e', 'adult4@example.org'),
  ('00000000-0000-0000-0000-00000000000f', 'outsider@example.org');

insert into public.d1_members (id, auth_user_id, display_name, adult_on, status, roles, verified_at, verification_source) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Lead Adult',   '1990-01-01', 'active', '{senior_leader}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Second Adult', '1985-06-01', 'active', '{}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c', 'Third Adult',  '1980-03-03', 'active', '{}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000d', 'Minor One',    current_date + 400, 'active', '{}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000e', 'Fourth Adult', '1979-03-03', 'active', '{}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-00000000000f', 'Outsider',     '1970-03-03', 'active', '{}', now(), 'admin');

\set lead     '''10000000-0000-0000-0000-00000000000a'''
\set adult2   '''10000000-0000-0000-0000-00000000000b'''
\set adult3   '''10000000-0000-0000-0000-00000000000c'''
\set minor1   '''10000000-0000-0000-0000-00000000000d'''
\set adult4   '''10000000-0000-0000-0000-00000000000e'''
\set outsider '''10000000-0000-0000-0000-00000000000f'''

create temp table ids (k text primary key, v uuid);
insert into ids select 'community', public.d1_create_community(:lead::uuid, 'Destiny Church', 'Everyone');
insert into ids select 'announce', id from public.d1_groups
  where community_id = (select v from ids where k = 'community') and kind = 'announcements';
select public.d1_add_community_members(:lead::uuid, (select v from ids where k = 'community'),
  array[:adult2, :adult3, :minor1, :adult4]::uuid[]);
insert into ids select 'group', public.d1_create_group(:lead::uuid, (select v from ids where k = 'community'),
  'Tuesday Life Group', null, null, array[:adult2, :adult3]::uuid[]);
select pg_temp.check((select state from public.d1_groups where id = (select v from ids where k = 'group')) = 'active', 'fixture: an active group of three adults');
create temp table found (k text primary key, v bigint);

-- ── Browser keys get nothing ────────────────────────────────────────────────
set role authenticated;
select pg_temp.expect_error('select * from public.d1_join_requests', 'permission denied');
select pg_temp.expect_error('select * from public.d1_discover_groups(null)', 'permission denied');
select pg_temp.expect_error('select public.d1_request_join(null, null, null)', 'permission denied');
select pg_temp.expect_error('select public.d1_decide_join_request(null, 1, true)', 'permission denied');
select pg_temp.expect_error('select public.d1_set_u18_suitable(null, true, null)', 'permission denied');
select pg_temp.expect_error('select public.d1_set_discover(null, null, true, null, null, null)', 'permission denied');
reset role;
select pg_temp.check(true, 'join requests and the Discover functions are closed to browser keys');

-- ── Opening a group ─────────────────────────────────────────────────────────
select pg_temp.check((select count(*) from public.d1_discover_groups(:adult4::uuid)) = 0, 'a group is not in Discover until a leader opens it');
select pg_temp.expect_error(
  format($$select public.d1_set_discover(%L, %L, true, 'x', null, null)$$, :adult2, (select v from ids where k = 'group')), 'Only the group''s leaders');
select pg_temp.expect_error(
  format($$select public.d1_set_discover(%L, %L, true, 'x', null, null)$$, :lead, (select v from ids where k = 'announce')), 'Only ordinary groups');
select pg_temp.expect_error(
  format($$select public.d1_request_join(%L, %L, null)$$, :adult4, (select v from ids where k = 'group')), 'isn''t open to join');
select public.d1_set_discover(:lead::uuid, (select v from ids where k = 'group'), true, '  Dinner and Bible study  ', 2::smallint, 'Bearsden');
select pg_temp.check(
  (select blurb = 'Dinner and Bible study' and meeting_day = 2 and meeting_area = 'Bearsden' and member_count = 3 and not u18_suitable and request_id is null
     from public.d1_discover_groups(:adult4::uuid)),
  'once opened, an adult in the community sees it with its details');

-- ── Who can see it ──────────────────────────────────────────────────────────
select pg_temp.check((select count(*) from public.d1_discover_groups(:adult2::uuid)) = 0, 'someone already in the group does not');
select pg_temp.check((select count(*) from public.d1_discover_groups(:outsider::uuid)) = 0, 'someone outside the community does not');
select pg_temp.check((select count(*) from public.d1_discover_groups(:minor1::uuid)) = 0, 'an under-18 does not see a group that is not marked suitable');
select pg_temp.expect_error(
  format($$select public.d1_request_join(%L, %L, null)$$, :minor1, (select v from ids where k = 'group')), 'isn''t open to join');
select pg_temp.expect_error(
  format($$select public.d1_request_join(%L, %L, null)$$, :outsider, (select v from ids where k = 'group')), 'isn''t open to join');
select pg_temp.check((select count(*) from public.d1_join_requests) = 0, 'and neither an under-18 nor an outsider can ask to join it');
select pg_temp.check(
  not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
               where n.nspname = 'public' and p.proname = 'd1_set_discover' and pg_get_function_arguments(p.oid) ilike '%u18%'),
  'opening a group has no way to set the under-18 mark');

-- ── Asking ──────────────────────────────────────────────────────────────────
select pg_temp.expect_error(
  format($$select public.d1_request_join(%L, %L, 'please')$$, :adult4, (select v from ids where k = 'group')), 'd1_join_requests_note_check');
insert into found select 'r1', public.d1_request_join(:adult4::uuid, (select v from ids where k = 'group'), 'd1e:v1:new.here');
select pg_temp.check((select status = 'pending' and note = 'd1e:v1:new.here' from public.d1_join_requests where id = (select v from found where k = 'r1')), 'an adult asks to join, with a sealed note');
select pg_temp.check((select request_id from public.d1_discover_groups(:adult4::uuid)) = (select v from found where k = 'r1'), 'Discover shows their waiting request');
select pg_temp.expect_error(
  format($$select public.d1_request_join(%L, %L, null)$$, :adult4, (select v from ids where k = 'group')), 'already asked');
select pg_temp.expect_error(
  format($$select public.d1_request_join(%L, %L, null)$$, :adult2, (select v from ids where k = 'group')), 'already in this group');

-- ── Deciding ────────────────────────────────────────────────────────────────
select pg_temp.expect_error(
  format($$select public.d1_decide_join_request(%L, %s, true)$$, :adult2, (select v from found where k = 'r1')), 'Only the group''s leaders');
select pg_temp.check(public.d1_decide_join_request(:lead::uuid, (select v from found where k = 'r1'), false) = :adult4::uuid, 'a leader declines');
select pg_temp.check(not public.d1_is_current_member((select v from ids where k = 'group'), :adult4::uuid), 'a declined person is not added');
select pg_temp.expect_error(
  format($$select public.d1_request_join(%L, %L, null)$$, :adult4, (select v from ids where k = 'group')), 'again in a few weeks');
select pg_temp.check((select declined_until > now() + interval '29 days' from public.d1_discover_groups(:adult4::uuid)), 'Discover says when they can ask again');
select pg_temp.expect_error(
  format($$select public.d1_decide_join_request(%L, %s, true)$$, :lead, (select v from found where k = 'r1')), 'already been answered');

update public.d1_join_requests set decided_at = now() - interval '31 days' where id = (select v from found where k = 'r1');
insert into found select 'r2', public.d1_request_join(:adult4::uuid, (select v from ids where k = 'group'), null);
select pg_temp.check(true, 'after 30 days they can ask again');
select pg_temp.check(public.d1_decide_join_request(:lead::uuid, (select v from found where k = 'r2'), true) = :adult4::uuid, 'a leader approves');
select pg_temp.check(public.d1_is_current_member((select v from ids where k = 'group'), :adult4::uuid), 'and the person is in the group');
select pg_temp.check((select count(*) from public.d1_discover_groups(:adult4::uuid)) = 0, 'so it leaves their Discover list');

-- ── Under-18s ───────────────────────────────────────────────────────────────
select public.d1_set_u18_suitable((select v from ids where k = 'group'), true, '00000000-0000-0000-0000-0000000000aa');
select pg_temp.check((select u18_suitable from public.d1_discover_groups(:minor1::uuid)), 'once a safeguarding admin marks it suitable, an under-18 sees it');
select pg_temp.check((select u18_marked_by = '00000000-0000-0000-0000-0000000000aa' and u18_marked_at is not null from public.d1_groups where id = (select v from ids where k = 'group')), 'who marked it is recorded');
insert into found select 'r3', public.d1_request_join(:minor1::uuid, (select v from ids where k = 'group'), null);

-- The mark is taken away while the request waits: it is withdrawn, and could not be approved anyway.
select public.d1_set_u18_suitable((select v from ids where k = 'group'), false, '00000000-0000-0000-0000-0000000000aa');
select pg_temp.check((select status from public.d1_join_requests where id = (select v from found where k = 'r3')) = 'withdrawn', 'removing the mark withdraws under-18s'' waiting requests');
update public.d1_join_requests set status = 'pending', decided_at = null where id = (select v from found where k = 'r3');
select pg_temp.expect_error(
  format($$select public.d1_decide_join_request(%L, %s, true)$$, :lead, (select v from found where k = 'r3')), 'through Discover any more');
select pg_temp.check(not public.d1_is_current_member((select v from ids where k = 'group'), :minor1::uuid), 'an under-18 can never be approved into a group that is not marked suitable');
select pg_temp.check((select count(*) from public.d1_discover_groups(:minor1::uuid)) = 0, 'and no longer sees it');

select public.d1_set_u18_suitable((select v from ids where k = 'group'), true, '00000000-0000-0000-0000-0000000000aa');
select pg_temp.check(public.d1_decide_join_request(:lead::uuid, (select v from found where k = 'r3'), true) = :minor1::uuid, 'with the mark back, the under-18 can be approved');
select pg_temp.check((select state from public.d1_groups where id = (select v from ids where k = 'group')) = 'active', 'and the group still meets the 2-adult rule');

-- ── Limits and withdrawing ──────────────────────────────────────────────────
insert into public.d1_members (id, display_name, adult_on, status, verified_at, verification_source) values
  ('10000000-0000-0000-0000-000000000010', 'Fifth Adult', '1975-01-01', 'active', now(), 'admin');
select public.d1_add_community_members(:lead::uuid, (select v from ids where k = 'community'), array['10000000-0000-0000-0000-000000000010']::uuid[]);
\set adult5 '''10000000-0000-0000-0000-000000000010'''
do $$
declare
  gid uuid;
  i integer;
begin
  for i in 1..4 loop
    gid := public.d1_create_group('10000000-0000-0000-0000-00000000000a', (select v from ids where k = 'community'),
      'Group ' || i, null, null, array['10000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000c']::uuid[]);
    perform public.d1_set_discover('10000000-0000-0000-0000-00000000000a', gid, true, null, null, null);
    insert into ids values ('g' || i, gid);
  end loop;
end;
$$;
select public.d1_request_join(:adult5::uuid, (select v from ids where k = 'g1'), null);
select public.d1_request_join(:adult5::uuid, (select v from ids where k = 'g2'), null);
select public.d1_request_join(:adult5::uuid, (select v from ids where k = 'g3'), null);
select pg_temp.expect_error(
  format($$select public.d1_request_join(%L, %L, null)$$, :adult5, (select v from ids where k = 'g4')), '3 requests waiting');
select pg_temp.check(true, 'a member can have 3 requests waiting, not 4');
select public.d1_withdraw_join_request(:adult5::uuid, (select v from ids where k = 'g1'));
select pg_temp.check(public.d1_request_join(:adult5::uuid, (select v from ids where k = 'g4'), null) > 0, 'withdrawing one frees a place');
select pg_temp.expect_error(
  format($$select public.d1_withdraw_join_request(%L, %L)$$, :adult4, (select v from ids where k = 'g2')), 'no request waiting');

-- ── Closing a group ─────────────────────────────────────────────────────────
select public.d1_set_discover(:lead::uuid, (select v from ids where k = 'g2'), false, null, null, null);
select pg_temp.expect_error(
  format($$select public.d1_decide_join_request(%L, %s, true)$$, :lead,
    (select id from public.d1_join_requests where group_id = (select v from ids where k = 'g2') and status = 'pending')),
  'through Discover any more');
select pg_temp.check(true, 'a request cannot be approved once the group is taken out of Discover');
