-- Destiny One message encryption at rest (migrations 20261004_01 and _02).
-- Run with: scripts/test-sql.sh destiny-one-encryption
--
-- The database never sees a key: the API seals text and computes search
-- terms. So here "sealed" values are stand-ins with the right prefix, and
-- terms are fixed hex strings. What's tested is what the database enforces:
-- plaintext is refused, search matches on terms with the same visibility as
-- before, and posting no longer leaves a readable copy in realtime.messages.

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

-- A 32-hex-character stand-in for one HMAC term.
create or replace function pg_temp.t(word text) returns text language sql immutable as $$
  select md5(word)
$$;

set client_min_messages = notice;

-- ── Fixture ─────────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'lead@example.org'),
  ('00000000-0000-0000-0000-00000000000b', 'adult2@example.org'),
  ('00000000-0000-0000-0000-00000000000c', 'adult3@example.org'),
  ('00000000-0000-0000-0000-00000000000d', 'minor1@example.org');

insert into public.d1_members (id, auth_user_id, display_name, adult_on, status, roles, verified_at, verification_source) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'Lead Adult',   '1990-01-01', 'active', '{senior_leader}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'Second Adult', '1985-06-01', 'active', '{}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c', 'Third Adult',  '1980-03-03', 'active', '{}', now(), 'admin'),
  ('10000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000d', 'Minor One',    current_date + 400, 'active', '{}', now(), 'admin');

\set lead   '''10000000-0000-0000-0000-00000000000a'''
\set adult2 '''10000000-0000-0000-0000-00000000000b'''
\set minor1 '''10000000-0000-0000-0000-00000000000d'''

create temp table ids (k text primary key, v uuid);
insert into ids select 'community', public.d1_create_community(:lead::uuid, 'Destiny Church', 'Everyone');
insert into ids select 'announce', id from public.d1_groups
  where community_id = (select v from ids where k = 'community') and kind = 'announcements';
select public.d1_add_community_members(:lead::uuid, (select v from ids where k = 'community'),
  array['10000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000c', :minor1]::uuid[]);

create temp table found (k text primary key, v bigint);

-- ── Plaintext is refused ────────────────────────────────────────────────────

select pg_temp.expect_error(
  format($$select public.d1_post_message(%L, %L, 'hello in the clear')$$, :lead, (select v from ids where k = 'announce')),
  'd1_messages_body_sealed');
select pg_temp.check(true, 'a plaintext body is refused');

select pg_temp.expect_error(
  format($$select public.d1_post_message(%L, %L, null, null, null,
    '{"kind":"poll","poll":{"id":"p","question":"Pizza?","options":[{"id":"o1","label":"d1e:v1:a.b"},{"id":"o2","label":"d1e:v1:c.d"}]}}'::jsonb)$$,
    :lead, (select v from ids where k = 'announce')),
  'd1_messages_poll_sealed');
select pg_temp.check(true, 'a poll with a plaintext question is refused');

select pg_temp.expect_error(
  format($$select public.d1_post_message(%L, %L, null, null, null,
    '{"kind":"poll","poll":{"id":"p","question":"d1e:v1:q.q","options":[{"id":"o1","label":"d1e:v1:a.b"},{"id":"o2","label":"Curry"}]}}'::jsonb)$$,
    :lead, (select v from ids where k = 'announce')),
  'd1_messages_poll_sealed');
select pg_temp.check(true, 'a poll with a plaintext option is refused');

insert into found select 'poll', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), null, null, null,
  '{"kind":"poll","poll":{"id":"p","question":"d1e:v1:q.q","options":[{"id":"o1","label":"d1e:v1:a.b"},{"id":"o2","label":"d1e:v1:c.d"}]}}'::jsonb);
select public.d1_vote(:adult2::uuid, (select v from found where k = 'poll'), array['o2']);
select pg_temp.check(
  (select count(*) from public.d1_poll_votes where message_id = (select v from found where k = 'poll')) = 1,
  'a sealed poll still takes votes (option ids stay plain)');

insert into found select 'event', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), null, null, null,
  '{"kind":"event","event":{"name":"Youth Night"}}'::jsonb);
select pg_temp.check((select v from found where k = 'event') > 0, 'event snapshots (public) are not required to be sealed');

-- ── Posting stores terms and broadcasts nothing ─────────────────────────────

delete from realtime.messages;
insert into found select 'live', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'),
  'd1e:v1:live.ciphertext', null, null, null, array[pg_temp.t('ru'), pg_temp.t('run'), pg_temp.t('sh'), pg_temp.t('sheet')]);

select pg_temp.check(
  (select count(*) from public.d1_message_terms where message_id = (select v from found where k = 'live')) = 4,
  'the search terms are stored with the message');
select pg_temp.check(
  not exists (select 1 from realtime.messages where event = 'message'),
  'posting leaves no copy of the message in realtime.messages');
select pg_temp.check(
  (select body from public.d1_messages where id = (select v from found where k = 'live')) = 'd1e:v1:live.ciphertext',
  'the body is stored exactly as the API sealed it');

-- ── Search on terms ─────────────────────────────────────────────────────────

insert into found select 'other', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'),
  'd1e:v1:other.ciphertext', null, null, null, array[pg_temp.t('ru'), pg_temp.t('run')]);
insert into found select 'gone', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'),
  'd1e:v1:gone.ciphertext', null, null, null, array[pg_temp.t('run'), pg_temp.t('sheet')]);
select public.d1_delete_message(:lead::uuid, (select v from found where k = 'gone'));

create temp table q as select jsonb_build_object((select v from ids where k = 'announce')::text,
  jsonb_build_array(pg_temp.t('run'), pg_temp.t('sheet'))) as terms;

select pg_temp.check(
  exists (select 1 from public.d1_search_messages(:lead::uuid, (select terms from q)) where id = (select v from found where k = 'live')),
  'search finds a message that has every term');
select pg_temp.check(
  not exists (select 1 from public.d1_search_messages(:lead::uuid, (select terms from q)) where id = (select v from found where k = 'other')),
  'search needs every word to match, not just one');
select pg_temp.check(
  not exists (select 1 from public.d1_search_messages(:lead::uuid, (select terms from q)) where id = (select v from found where k = 'gone')),
  'search never returns a deleted message');
select pg_temp.check(
  (select body from public.d1_search_messages(:lead::uuid, (select terms from q)) limit 1) like 'd1e:%',
  'search hands back the sealed body for the API to open');
select pg_temp.check(
  (select count(*) from public.d1_search_messages('10000000-0000-0000-0000-0000000000ff'::uuid, (select terms from q))) = 0,
  'search finds nothing in a group you are not in, whatever terms you send');
select pg_temp.check(
  (select count(*) from public.d1_search_messages(:lead::uuid, '{"not-a-uuid": ["x"]}'::jsonb)) = 0
  and (select count(*) from public.d1_search_messages(:lead::uuid, '[]'::jsonb)) = 0
  and (select count(*) from public.d1_search_messages(:lead::uuid, jsonb_build_object((select v from ids where k = 'announce')::text, '[]'::jsonb))) = 0,
  'malformed or empty terms find nothing rather than erroring');

-- ── Immutable, sealed, and service-role only ────────────────────────────────

select pg_temp.expect_error(
  format($$update public.d1_messages set body = 'd1e:v1:rewritten' where id = %s$$, (select v from found where k = 'live')),
  'cannot be edited');
select pg_temp.check(true, 'a sealed message cannot be swapped for another sealed value');

select pg_temp.expect_error(
  format($$update public.d1_messages set body = 'readable again' where id = %s$$, (select v from found where k = 'live')),
  'cannot be edited');
select pg_temp.check(true, 'a sealed message cannot be turned back into plaintext');

select pg_temp.expect_error(
  format($$select public.d1_report_message(%L, %s, 'plain reason')$$, :minor1, (select v from found where k = 'live')),
  'd1_reports_reason_sealed');
select pg_temp.check(true, 'a plaintext report reason is refused');
select pg_temp.check(
  public.d1_report_message(:minor1::uuid, (select v from found where k = 'live'), 'd1e:v1:reason.sealed') > 0,
  'a sealed report reason is accepted');

select pg_temp.check(
  not has_function_privilege('authenticated', 'public.d1_post_message(uuid, uuid, text, bigint, uuid, jsonb, text[])', 'execute')
  and has_function_privilege('service_role', 'public.d1_post_message(uuid, uuid, text, bigint, uuid, jsonb, text[])', 'execute')
  and not has_function_privilege('authenticated', 'public.d1_search_messages(uuid, jsonb, integer)', 'execute')
  and has_function_privilege('service_role', 'public.d1_search_messages(uuid, jsonb, integer)', 'execute')
  and not has_table_privilege('authenticated', 'public.d1_message_terms', 'select')
  and not has_table_privilege('anon', 'public.d1_message_terms', 'select'),
  'posting, search and the term index are service-role only');

select pg_temp.check(
  not exists (select 1 from pg_proc where proname = 'd1_post_message' and pronargs = 6)
  and not exists (select 1 from pg_proc where proname = 'd1_search_messages' and pg_get_function_identity_arguments(oid) like '%text, integer'),
  'the old plaintext-era signatures are gone');

delete from public.d1_messages where id = (select v from found where k = 'other');
select pg_temp.check(
  not exists (select 1 from public.d1_message_terms where message_id = (select v from found where k = 'other')),
  'deleting a message (the retention purge) deletes its terms');
