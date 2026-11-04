-- Admin two-factor tables (migration 20261104_01_admin_two_factor.sql).
-- Run with: scripts/test-sql.sh admin-two-factor

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

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@example.org');

insert into public.admin_mfa_recovery_codes (auth_user_id, code_hash)
values ('00000000-0000-0000-0000-0000000000a1', 'hash-one');

-- ── Browser keys get nothing ────────────────────────────────────────────────
set role anon;
select pg_temp.expect_error('select * from public.admin_mfa_recovery_codes', 'permission denied');
select pg_temp.expect_error('select * from public.admin_mfa_lockouts', 'permission denied');
select pg_temp.expect_error(
  $$select public.admin_mfa_record_failure('00000000-0000-0000-0000-0000000000a1')$$,
  'permission denied');
reset role;

set role authenticated;
select set_config('test.uid', '00000000-0000-0000-0000-0000000000a1', false);
select pg_temp.expect_error('select * from public.admin_mfa_recovery_codes', 'permission denied');
select pg_temp.expect_error(
  $$insert into public.admin_mfa_recovery_codes (auth_user_id, code_hash)
    values ('00000000-0000-0000-0000-0000000000a1', 'planted')$$,
  'permission denied');
select pg_temp.expect_error(
  $$select public.admin_mfa_record_failure('00000000-0000-0000-0000-0000000000a1')$$,
  'permission denied');
reset role;
select pg_temp.check(true, 'anon and authenticated cannot touch codes, lockouts or the failure counter');

-- ── Codes are unique ────────────────────────────────────────────────────────
select pg_temp.expect_error(
  $$insert into public.admin_mfa_recovery_codes (auth_user_id, code_hash)
    values ('00000000-0000-0000-0000-0000000000a1', 'hash-one')$$,
  'duplicate key');
select pg_temp.check(true, 'the same code hash cannot be stored twice');

-- ── Lockout after five wrong guesses ────────────────────────────────────────
select pg_temp.check(
  (select public.admin_mfa_record_failure('00000000-0000-0000-0000-0000000000a1')) is null,
  'one wrong guess does not lock');
select public.admin_mfa_record_failure('00000000-0000-0000-0000-0000000000a1');
select public.admin_mfa_record_failure('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check(
  (select public.admin_mfa_record_failure('00000000-0000-0000-0000-0000000000a1')) is null,
  'four wrong guesses do not lock');
select pg_temp.check(
  (select public.admin_mfa_record_failure('00000000-0000-0000-0000-0000000000a1')) > now() + interval '14 minutes',
  'the fifth wrong guess locks for fifteen minutes');

-- An old window starts again from one.
update public.admin_mfa_lockouts
  set locked_until = null, failed_count = 4, window_started_at = now() - interval '1 hour'
  where auth_user_id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.check(
  (select public.admin_mfa_record_failure('00000000-0000-0000-0000-0000000000a1')) is null,
  'guesses from an expired window are forgotten');
select pg_temp.check(
  (select failed_count from public.admin_mfa_lockouts
    where auth_user_id = '00000000-0000-0000-0000-0000000000a1') = 1,
  'the count restarts at one');

-- ── Deleting the login removes its codes ────────────────────────────────────
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.check(
  not exists (select 1 from public.admin_mfa_recovery_codes)
  and not exists (select 1 from public.admin_mfa_lockouts),
  'codes and lockouts go with the login');
