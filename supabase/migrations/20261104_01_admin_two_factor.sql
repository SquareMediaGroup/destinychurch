-- Two-factor sign-in for admins (lib/twoFactor.ts, app/login/2fa).
--
-- The authenticator app itself is Supabase Auth's own TOTP factor; nothing
-- here stores its secret. What Supabase doesn't give us (outside an
-- experimental flag) is backup codes, so they live here:
--
--   admin_mfa_recovery_codes   8 one-time codes per admin, SHA-256 hashed.
--                              Codes are 16 random characters from a 31-letter alphabet (about 79 bits),
--                              so a fast hash is enough: even with this table
--                              in hand, guessing one is out of reach.
--   admin_mfa_lockouts         wrong backup-code guesses per admin; five in
--                              fifteen minutes locks backup codes for fifteen.
--
-- Only the service role touches either table (the website's server routes).
-- RLS is on with no policies, and anon/authenticated have no grants, so the
-- public key in the browser can't read or write a row.

create table if not exists public.admin_mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null unique,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_mfa_recovery_codes_user_idx
  on public.admin_mfa_recovery_codes (auth_user_id);

alter table public.admin_mfa_recovery_codes enable row level security;
revoke all on public.admin_mfa_recovery_codes from anon, authenticated;

create table if not exists public.admin_mfa_lockouts (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  failed_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz
);

alter table public.admin_mfa_lockouts enable row level security;
revoke all on public.admin_mfa_lockouts from anon, authenticated;

-- Count one wrong backup code and say whether the account is now locked.
-- One statement, so two guesses racing each other both count.
create or replace function public.admin_mfa_record_failure(p_user uuid)
returns timestamptz
language plpgsql
set search_path = public
as $$
declare
  v_window interval := interval '15 minutes';
  v_max integer := 5;
  v_row public.admin_mfa_lockouts;
begin
  insert into public.admin_mfa_lockouts as l (auth_user_id, failed_count, window_started_at)
  values (p_user, 1, now())
  on conflict (auth_user_id) do update
    set failed_count = case
          when l.window_started_at < now() - v_window then 1
          else l.failed_count + 1
        end,
        window_started_at = case
          when l.window_started_at < now() - v_window then now()
          else l.window_started_at
        end
  returning * into v_row;

  if v_row.failed_count >= v_max then
    update public.admin_mfa_lockouts
      set locked_until = now() + v_window, failed_count = 0, window_started_at = now()
      where auth_user_id = p_user
      returning * into v_row;
  end if;

  return v_row.locked_until;
end;
$$;

revoke all on function public.admin_mfa_record_failure(uuid) from public, anon, authenticated;
grant execute on function public.admin_mfa_record_failure(uuid) to service_role;
