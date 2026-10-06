-- Destiny One v0.8 (migrations 20261006_*): editing, mentions, pins, read
-- receipts, link previews, forwarding and voice notes.
-- Run with: scripts/test-sql.sh destiny-one-v08
--
-- Built on the encryption migrations, so "sealed" values are stand-ins with
-- the d1e: prefix and search terms are fixed hex strings, as in
-- destiny-one-encryption.sql.

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

-- ── Editing (20261006_01) ───────────────────────────────────────────────────

insert into found select 'mine', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'),
  'd1e:v1:first.version', null, null, null, array[pg_temp.t('fi'), pg_temp.t('first')]);

select pg_temp.check(
  public.d1_edit_message(:lead::uuid, (select v from found where k = 'mine'), 'd1e:v1:second.version', array[pg_temp.t('se'), pg_temp.t('second')]) is not null,
  'the sender can edit their message');
select pg_temp.check(
  (select body from public.d1_messages where id = (select v from found where k = 'mine')) = 'd1e:v1:second.version'
  and (select edited_at from public.d1_messages where id = (select v from found where k = 'mine')) is not null,
  'the message now says the new text and is marked edited');
select pg_temp.check(
  (select previous_body from public.d1_message_edits where message_id = (select v from found where k = 'mine')) = 'd1e:v1:first.version',
  'the old text is kept for safeguarding review');
select pg_temp.check(
  exists (select 1 from public.d1_message_terms where message_id = (select v from found where k = 'mine') and term = pg_temp.t('second'))
  and not exists (select 1 from public.d1_message_terms where message_id = (select v from found where k = 'mine') and term = pg_temp.t('first')),
  'search terms follow the new wording');

select pg_temp.expect_error(
  format($$select public.d1_edit_message(%L, %s, 'd1e:v1:hijack')$$, :adult2, (select v from found where k = 'mine')),
  'only edit your own');
select pg_temp.check(true, 'someone else cannot edit your message');

select pg_temp.expect_error(
  format($$select public.d1_edit_message(%L, %s, 'not sealed')$$, :lead, (select v from found where k = 'mine')),
  'd1_messages_body_sealed');
select pg_temp.check(true, 'an edit must be sealed too');

select pg_temp.expect_error(
  format($$select public.d1_edit_message(%L, %s, '   ')$$, :lead, (select v from found where k = 'mine')),
  'say nothing');
select pg_temp.check(true, 'a message cannot be edited to nothing');

select pg_temp.expect_error(
  format($$update public.d1_messages set body = 'd1e:v1:sneaky', edited_at = now() where id = %s$$, (select v from found where k = 'mine')),
  'cannot be edited');
select pg_temp.check(true, 'a direct update is still refused (only d1_edit_message may edit)');

insert into found select 'poll', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), null, null, null,
  '{"kind":"poll","poll":{"id":"p","question":"d1e:v1:q.q","options":[{"id":"o1","label":"d1e:v1:a.b"},{"id":"o2","label":"d1e:v1:c.d"}]}}'::jsonb);
select pg_temp.expect_error(
  format($$select public.d1_edit_message(%L, %s, 'd1e:v1:caption')$$, :lead, (select v from found where k = 'poll')),
  'Only messages with text');
select pg_temp.check(true, 'a message with no text (a poll) cannot be edited');

insert into found select 'old', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'd1e:v1:old.one');
set session_replication_role = replica;
update public.d1_messages set created_at = now() - interval '16 minutes' where id = (select v from found where k = 'old');
set session_replication_role = origin;
select pg_temp.expect_error(
  format($$select public.d1_edit_message(%L, %s, 'd1e:v1:too.late')$$, :lead, (select v from found where k = 'old')),
  '15 minutes');
select pg_temp.check(true, 'editing closes 15 minutes after sending');

insert into found select 'gone', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'd1e:v1:gone');
select public.d1_delete_message(:lead::uuid, (select v from found where k = 'gone'));
select pg_temp.expect_error(
  format($$select public.d1_edit_message(%L, %s, 'd1e:v1:back')$$, :lead, (select v from found where k = 'gone')),
  'was deleted');
select pg_temp.check(true, 'a deleted message cannot be edited');

do $$
begin
  for i in 1..9 loop
    perform public.d1_edit_message('10000000-0000-0000-0000-00000000000a', (select v from found where k = 'mine'), 'd1e:v1:again.' || i);
  end loop;
end;
$$;
select pg_temp.expect_error(
  format($$select public.d1_edit_message(%L, %s, 'd1e:v1:eleventh')$$, :lead, (select v from found where k = 'mine')),
  'too many times');
select pg_temp.check(true, 'a message can be edited at most 10 times');

select pg_temp.check(
  not has_function_privilege('authenticated', 'public.d1_edit_message(uuid, bigint, text, text[], uuid[])', 'execute')
  and has_function_privilege('service_role', 'public.d1_edit_message(uuid, bigint, text, text[], uuid[])', 'execute')
  and not has_table_privilege('authenticated', 'public.d1_message_edits', 'select'),
  'editing and the edit history are service-role only');

delete from public.d1_messages where id = (select v from found where k = 'mine');
select pg_temp.check(
  not exists (select 1 from public.d1_message_edits where message_id = (select v from found where k = 'mine')),
  'the retention purge removes the edit history with the message');

-- ── Mentions (20261006_02) ──────────────────────────────────────────────────

insert into found select 'mention', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'),
  'd1e:v1:hi.adult2', null, null, null, null,
  array[:adult2::uuid, :adult2::uuid, :lead::uuid, '10000000-0000-0000-0000-0000000000ff'::uuid]);
select pg_temp.check(
  (select mentions from public.d1_messages where id = (select v from found where k = 'mention')) = array[:adult2::uuid],
  'mentions keep only current members, once each, never the sender or an outsider');

select public.d1_edit_message(:lead::uuid, (select v from found where k = 'mention'), 'd1e:v1:hi.minor', null, array[:minor1::uuid]);
select pg_temp.check(
  (select mentions from public.d1_messages where id = (select v from found where k = 'mention')) = array[:minor1::uuid],
  'an edit can change who is mentioned');
select public.d1_edit_message(:lead::uuid, (select v from found where k = 'mention'), 'd1e:v1:hi.again');
select pg_temp.check(
  (select mentions from public.d1_messages where id = (select v from found where k = 'mention')) = array[:minor1::uuid],
  'an edit without mentions leaves them as they were');

select pg_temp.expect_error(
  format($$update public.d1_messages set mentions = '{}' where id = %s$$, (select v from found where k = 'mention')),
  'cannot be edited');
select pg_temp.check(true, 'mentions cannot be changed outside an edit');

select pg_temp.check(
  not exists (select 1 from pg_proc where proname = 'd1_post_message' and pronargs <> 9)
  and not has_function_privilege('authenticated', 'public.d1_post_message(uuid, uuid, text, bigint, uuid, jsonb, text[], uuid[], bigint)', 'execute')
  and not has_function_privilege('authenticated', 'public.d1_valid_mentions(uuid, uuid, uuid[])', 'execute'),
  'one d1_post_message (with mentions and forwarding), service-role only');

-- ── Pins (20261006_03) ──────────────────────────────────────────────────────

insert into found select 'p1', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'd1e:v1:p1');
insert into found select 'p2', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'd1e:v1:p2');
insert into found select 'p3', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'd1e:v1:p3');
insert into found select 'p4', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'd1e:v1:p4');

delete from realtime.messages;
select public.d1_pin_message(:lead::uuid, (select v from found where k = 'p1'), true);
select pg_temp.check(
  exists (select 1 from public.d1_pins where message_id = (select v from found where k = 'p1'))
  and exists (select 1 from realtime.messages where event = 'pins_changed'),
  'a group manager can pin, and everyone hears pins_changed');

select pg_temp.expect_error(
  format($$select public.d1_pin_message(%L, %s, true)$$, :adult2, (select v from found where k = 'p2')),
  'Only group admins');
select pg_temp.check(true, 'an ordinary member cannot pin');

select public.d1_pin_message(:lead::uuid, (select v from found where k = 'p2'), true);
select public.d1_pin_message(:lead::uuid, (select v from found where k = 'p3'), true);
select public.d1_pin_message(:lead::uuid, (select v from found where k = 'p4'), true);
select pg_temp.check(
  (select count(*) from public.d1_pins where group_id = (select v from ids where k = 'announce')) = 3
  and not exists (select 1 from public.d1_pins where message_id = (select v from found where k = 'p1')),
  'at most 3 pins: a fourth unpins the oldest');

select public.d1_pin_message(:lead::uuid, (select v from found where k = 'p4'), false);
select pg_temp.check(
  not exists (select 1 from public.d1_pins where message_id = (select v from found where k = 'p4')),
  'a manager can unpin');

select public.d1_delete_message(:lead::uuid, (select v from found where k = 'p1'));
select pg_temp.expect_error(
  format($$select public.d1_pin_message(%L, %s, true)$$, :lead, (select v from found where k = 'p1')),
  'was deleted');
select pg_temp.check(true, 'a deleted message cannot be pinned');

select pg_temp.check(
  not has_function_privilege('authenticated', 'public.d1_pin_message(uuid, bigint, boolean)', 'execute')
  and not has_table_privilege('authenticated', 'public.d1_pins', 'select'),
  'pins are service-role only');

-- ── Read receipts (20261006_04) ─────────────────────────────────────────────

insert into found select 'rr', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'd1e:v1:rr');
update public.d1_group_members set last_read_message_id = (select v from found where k = 'rr')
  where group_id = (select v from ids where k = 'announce') and member_id = :adult2::uuid;
update public.d1_members set read_receipts = false where id = :minor1::uuid;

create temp table rr as select * from public.d1_read_receipts(:lead::uuid, (select v from found where k = 'rr'));
select pg_temp.check(
  (select status from rr where member_id = :adult2::uuid) = 'read'
  and (select status from rr where member_id = '10000000-0000-0000-0000-00000000000c'::uuid) = 'unread',
  'the sender sees who has and has not read it');
select pg_temp.check(
  (select status from rr where member_id = :minor1::uuid) = 'hidden',
  'someone with read receipts off shows as hidden');
select pg_temp.check(
  not exists (select 1 from rr where member_id = :lead::uuid),
  'the sender is not in their own list');

select pg_temp.expect_error(
  format($$select * from public.d1_read_receipts(%L, %s)$$, :adult2, (select v from found where k = 'rr')),
  'your own messages');
select pg_temp.check(true, 'an ordinary member cannot see receipts on someone else''s message');

update public.d1_members set read_receipts = false where id = :lead::uuid;
select pg_temp.expect_error(
  format($$select * from public.d1_read_receipts(%L, %s)$$, :lead, (select v from found where k = 'rr')),
  'Turn on read receipts');
select pg_temp.check(true, 'with read receipts off you see no one''s (reciprocal)');
update public.d1_members set read_receipts = true where id = :lead::uuid;

select pg_temp.check(
  not has_function_privilege('authenticated', 'public.d1_read_receipts(uuid, bigint)', 'execute'),
  'read receipts are service-role only');

-- ── Link previews (20261006_05) ─────────────────────────────────────────────

insert into found select 'link', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'd1e:v1:has.a.link');
select public.d1_set_link_preview((select v from found where k = 'link'), 'd1e:v1:preview.json');
select pg_temp.check(
  (select link_preview from public.d1_messages where id = (select v from found where k = 'link')) = 'd1e:v1:preview.json',
  'the API can attach a sealed preview');
select pg_temp.expect_error(
  format($$select public.d1_set_link_preview(%s, '{"title":"plain"}')$$, (select v from found where k = 'link')),
  'd1_messages_link_preview_sealed');
select pg_temp.check(true, 'a plaintext preview is refused');
select pg_temp.expect_error(
  format($$update public.d1_messages set link_preview = null where id = %s$$, (select v from found where k = 'link')),
  'cannot be edited');
select pg_temp.check(true, 'a preview cannot be changed outside d1_set_link_preview');
select pg_temp.check(
  not has_function_privilege('authenticated', 'public.d1_set_link_preview(bigint, text)', 'execute'),
  'setting previews is service-role only');

-- ── Forwarding (20261006_06) ────────────────────────────────────────────────

-- A second group in the same community for the lead and adult2 (+ a third adult for the rules).
insert into ids select 'team', public.d1_create_group(:lead::uuid, (select v from ids where k = 'community'), 'Team', null, null,
  array[:adult2::uuid, '10000000-0000-0000-0000-00000000000c'::uuid]);

insert into found select 'src', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), 'd1e:v1:original');
insert into found select 'fwd', public.d1_post_message(:lead::uuid, (select v from ids where k = 'team'), 'd1e:v1:copy', null, null, null, null, null, (select v from found where k = 'src'));
select pg_temp.check(
  (select forwarded_from from public.d1_messages where id = (select v from found where k = 'fwd')) = (select v from found where k = 'src'),
  'a forward remembers the original');

select pg_temp.expect_error(
  format($$select public.d1_post_message('10000000-0000-0000-0000-0000000000ff', %L, 'd1e:v1:x', null, null, null, null, null, %s)$$,
    (select v from ids where k = 'team'), (select v from found where k = 'src')),
  'only forward messages you can see');
select pg_temp.check(true, 'someone outside the original group cannot forward it');

select public.d1_delete_message(:lead::uuid, (select v from found where k = 'src'));
select pg_temp.expect_error(
  format($$select public.d1_post_message(%L, %L, 'd1e:v1:x', null, null, null, null, null, %s)$$,
    :lead, (select v from ids where k = 'team'), (select v from found where k = 'src')),
  'only forward messages you can see');
select pg_temp.check(true, 'a deleted message cannot be forwarded');

-- ── Voice notes (20261006_07) ───────────────────────────────────────────────

insert into public.d1_attachments (id, group_id, uploader_id, storage_path, mime_type, size_bytes, duration_ms)
  values ('20000000-0000-0000-0000-000000000001', (select v from ids where k = 'announce'), :lead::uuid,
          (select v from ids where k = 'announce') || '/20000000-0000-0000-0000-000000000001', 'audio/mp4', 48000, 12000);
insert into found select 'voice', public.d1_post_message(:lead::uuid, (select v from ids where k = 'announce'), null, null, '20000000-0000-0000-0000-000000000001'::uuid);
select pg_temp.check((select v from found where k = 'voice') > 0, 'a voice note (audio/mp4) can be sent like any attachment');

select pg_temp.expect_error(
  format($$insert into public.d1_attachments (group_id, uploader_id, storage_path, mime_type) values (%L, %L, 'x/y', 'audio/mpeg')$$,
    (select v from ids where k = 'announce'), :lead),
  'd1_attachments_mime_type_check');
select pg_temp.check(true, 'other audio formats are still refused');

select pg_temp.expect_error(
  format($$insert into public.d1_attachments (group_id, uploader_id, storage_path, mime_type, duration_ms) values (%L, %L, 'x/z', 'audio/mp4', 400000)$$,
    (select v from ids where k = 'announce'), :lead),
  'd1_attachments_duration');
select pg_temp.check(true, 'voice notes are at most 5 minutes');
