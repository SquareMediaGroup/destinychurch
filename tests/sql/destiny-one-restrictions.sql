-- Destiny One — timed posting restrictions and report escalation
-- (migration 20261011_01, used by the D1 Admin desktop app).
-- Run with: scripts/test-sql.sh destiny-one-restrictions

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

-- ── Fixture: one community, its announcements, three adults ────────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'lead@example.org'),
  ('00000000-0000-0000-0000-00000000000b', 'adult2@example.org'),
  ('00000000-0000-0000-0000-00000000000c', 'adult3@example.org');

insert into public.d1_members (id, auth_user_id, display_name, adult_on, status, roles, verified_at, verification_source) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Lead Adult',   '1990-01-01', 'active', '{senior_leader}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Second Adult', '1985-06-01', 'active', '{}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c', 'Third Adult',  '1980-03-03', 'active', '{}', now(), 'admin');

\set lead   '''10000000-0000-0000-0000-00000000000a'''

create temp table ids (k text primary key, v uuid);
insert into ids select 'community', public.d1_create_community(:lead::uuid, 'Destiny Church', 'Everyone');
insert into ids select 'announce', id from public.d1_groups
  where community_id = (select v from ids where k = 'community') and kind = 'announcements';
select public.d1_add_community_members(:lead::uuid, (select v from ids where k = 'community'),
  array['10000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000c']::uuid[]);

create temp table found (k text primary key, v bigint);

-- ── Restrictions ────────────────────────────────────────────────────────────

insert into found select 'before', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'),
  'd1e:v1:before', null, null, null, array[md5('be')]);
select pg_temp.check((select v from found where k = 'before') is not null, 'an unrestricted member can post');

update public.d1_members set posting_restricted_until = now() + interval '7 days' where id = :lead::uuid;

select pg_temp.expect_error(
  format($$select public.d1_post_message(%L, %L, 'd1e:v1:during', null, null, null, array[md5('du')])$$,
    :lead, (select v from ids where k = 'announce')),
  'can''t post until');
select pg_temp.check(
  (select count(*) from public.d1_messages where group_id = (select v from ids where k = 'announce')) = 1,
  'a restricted member''s message is refused and nothing is written');

select pg_temp.expect_error(
  format($$select public.d1_react(%L, %s, 'x', true)$$, :lead, (select v from found where k = 'before')),
  'can''t post until');
select pg_temp.check(
  not exists (select 1 from public.d1_reactions where member_id = :lead::uuid),
  'a restricted member can''t react either');

select pg_temp.expect_error(
  format($$select public.d1_edit_message(%L, %s, 'd1e:v1:edited', null, null)$$, :lead, (select v from found where k = 'before')),
  'can''t post until');
select pg_temp.check(
  (select body from public.d1_messages where id = (select v from found where k = 'before')) = 'd1e:v1:before',
  'a restricted member can''t edit an earlier message either');

select public.d1_react('10000000-0000-0000-0000-00000000000b'::uuid, (select v from found where k = 'before'), 'x', true);
select pg_temp.check(
  exists (select 1 from public.d1_reactions where member_id = '10000000-0000-0000-0000-00000000000b'),
  'other members are unaffected');

select pg_temp.check(
  (select status from public.d1_members where id = :lead::uuid) = 'active'
  and (select state from public.d1_groups where id = (select v from ids where k = 'announce')) = 'active',
  'a restriction is not a suspension: they stay active and the group stays open');

update public.d1_members set posting_restricted_until = now() - interval '1 minute' where id = :lead::uuid;
insert into found select 'after', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'),
  'd1e:v1:after', null, null, null, array[md5('af')]);
select pg_temp.check((select v from found where k = 'after') is not null, 'the restriction lifts itself once its time has passed');

-- ── Escalation columns ──────────────────────────────────────────────────────

insert into public.d1_reports (message_id, group_id, reporter_id, reason)
  values ((select v from found where k = 'before'), (select v from ids where k = 'announce'), '10000000-0000-0000-0000-00000000000b', 'd1e:v1:reason');
update public.d1_reports set escalated_at = now(), escalated_by = '00000000-0000-0000-0000-00000000000c', status = 'reviewing';
select pg_temp.check(
  (select escalated_at is not null and status = 'reviewing' from public.d1_reports limit 1),
  'a report can be marked escalated and stays in review');
