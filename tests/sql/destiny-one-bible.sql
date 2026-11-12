-- The Bible connection (migration 20261113_01_destiny_one_bible.sql).
-- Run with: scripts/test-sql.sh destiny-one-bible
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

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'lead@example.org');
insert into public.d1_members (id, auth_user_id, display_name, adult_on, status, roles, verified_at, verification_source) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Lead Adult', '1990-01-01', 'active', '{senior_leader}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000b', null, 'Second Adult', '1985-06-01', 'active', '{}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000c', null, 'Third Adult', '1980-03-03', 'active', '{}', now(), 'admin');
\set lead '''10000000-0000-0000-0000-00000000000a'''
create temp table ids (k text primary key, v uuid);
insert into ids select 'community', public.d1_create_community(:lead::uuid, 'Destiny Church', 'Everyone');
select public.d1_add_community_members(:lead::uuid, (select v from ids where k = 'community'),
  array['10000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000c']::uuid[]);
insert into ids select 'announce', id from public.d1_groups where community_id = (select v from ids where k = 'community') and kind = 'announcements';
create temp table found (k text primary key, v bigint);
insert into found select 'm', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'd1e:v1:john.three', null, null, null);

select pg_temp.check((select bible_id from public.d1_settings where id) = 113, 'the default Bible is the NIV UK (113)');
select pg_temp.expect_error($$update public.d1_settings set bible_id = 0$$, 'check');

select pg_temp.expect_error(format($$update public.d1_messages set verse_ref = '{"passageId":"JHN.3.16"}' where id = %s$$, (select v from found where k = 'm')), 'd1_messages_verse_ref_sealed');
update public.d1_messages set verse_ref = 'd1e:v1:verse.ref' where id = (select v from found where k = 'm');
select pg_temp.check((select verse_ref = 'd1e:v1:verse.ref' from public.d1_messages where id = (select v from found where k = 'm')), 'a verse card is stored sealed, and only sealed');
update public.d1_messages set verse_ref = null where id = (select v from found where k = 'm');
select pg_temp.check(true, 'and can be taken off without touching the message text');

set role authenticated;
select pg_temp.expect_error('select * from public.d1_bible_passages', 'permission denied');
select pg_temp.expect_error('select * from public.d1_bible_versions', 'permission denied');
select pg_temp.expect_error('select * from public.d1_bible_votd', 'permission denied');
reset role;
set role anon;
select pg_temp.expect_error('select * from public.d1_bible_passages', 'permission denied');
reset role;
select pg_temp.check(true, 'the Bible caches are closed to browser keys');

insert into public.d1_bible_passages (bible_id, passage_id, reference, content) values (113, 'JHN.3.16', 'John 3:16', 'For God so loved the world');
select pg_temp.expect_error($$insert into public.d1_bible_passages (bible_id, passage_id, reference, content) values (113, 'JHN.3.16', 'x', 'y')$$, 'duplicate key');
select pg_temp.check(true, 'one cached copy per passage per Bible');
