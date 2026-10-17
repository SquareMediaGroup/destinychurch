-- Database bug fixes (migration 20261017_01_bug_fixes.sql).
-- Run with: scripts/test-sql.sh bug-fixes

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

-- ── Fixture: one community, a group of three adults ────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'lead@example.org'),
  ('00000000-0000-0000-0000-00000000000b', 'adult2@example.org'),
  ('00000000-0000-0000-0000-00000000000c', 'adult3@example.org');

insert into public.d1_members (id, auth_user_id, display_name, adult_on, status, roles, verified_at, verification_source) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Lead Adult',   '1990-01-01', 'active', '{senior_leader}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Second Adult', '1985-06-01', 'active', '{}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c', 'Third Adult',  '1980-03-03', 'active', '{}', now(), 'admin');

\set lead   '''10000000-0000-0000-0000-00000000000a'''
\set second '''10000000-0000-0000-0000-00000000000b'''

create temp table ids (k text primary key, v uuid);
insert into ids select 'community', public.d1_create_community(:lead::uuid, 'Destiny Church', 'Everyone');
select public.d1_add_community_members(:lead::uuid, (select v from ids where k = 'community'),
  array['10000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000c']::uuid[]);
insert into ids select 'group', public.d1_create_group(:lead::uuid, (select v from ids where k = 'community'),
  'Worship', null, null, array['10000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000c']::uuid[]);

create temp table found (k text primary key, v bigint);

-- ── Retention purge with a reply across the boundary ────────────────────────

insert into found select 'old', public.d1_post_message(:lead::uuid, (select v from ids where k = 'group'), 'd1e:v1:old');
insert into found select 'reply', public.d1_post_message(:second::uuid, (select v from ids where k = 'group'),
  'd1e:v1:reply', (select v from found where k = 'old'));

alter table public.d1_messages disable trigger d1_messages_immutable;
update public.d1_messages set created_at = now() - interval '400 days' where id = (select v from found where k = 'old');
alter table public.d1_messages enable trigger d1_messages_immutable;

select pg_temp.check(
  (select messages_deleted from public.d1_purge_expired(365)) = 1,
  'the purge deletes an expired message that a newer message replies to');
select pg_temp.check(
  (select reply_to is null from public.d1_messages where id = (select v from found where k = 'reply')),
  'the newer reply is kept, its reply_to cleared');

select pg_temp.expect_error(
  format('update public.d1_messages set reply_to = %s where id = %s',
    (select v from found where k = 'reply'), (select v from found where k = 'reply')),
  'Messages cannot be edited');

-- ── Erasure clears the access-request fields ────────────────────────────────

update public.d1_members
  set declared_adult_on = '1985-06-01', request_note = 'Invited by Lead Adult (leader says: adult)',
      request_group_ids = array[(select v from ids where k = 'group')]
  where id = :second::uuid;
select public.d1_erase_member(:second::uuid);
select pg_temp.check(
  (select status = 'deleted' and declared_adult_on is null and request_note is null and request_group_ids = '{}'
     from public.d1_members where id = :second::uuid),
  'erasure removes the self-declared age, request note and invited groups');

-- ── The last Super Admin can't be removed ───────────────────────────────────

insert into public.admin_roles (auth_user_id, super_admin) values
  ('00000000-0000-0000-0000-00000000000a', true),
  ('00000000-0000-0000-0000-00000000000b', true);

select pg_temp.expect_error('update public.admin_roles set super_admin = false', 'last remaining Super Admin');
update public.admin_roles set super_admin = false where auth_user_id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check(
  (select count(*) from public.admin_roles where super_admin) = 1,
  'demoting one of two Super Admins is allowed');
select pg_temp.expect_error(
  $$update public.admin_roles set super_admin = false where auth_user_id = '00000000-0000-0000-0000-00000000000b'$$,
  'last remaining Super Admin');
select pg_temp.expect_error(
  $$delete from public.admin_roles where auth_user_id = '00000000-0000-0000-0000-00000000000b'$$,
  'last remaining Super Admin');
delete from public.admin_roles where auth_user_id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check(
  (select count(*) from public.admin_roles) = 1,
  'removing someone who isn''t a Super Admin is unaffected');

\echo 'All bug-fix SQL checks passed.'
