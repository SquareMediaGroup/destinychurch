-- Destiny One: does this account already have a password?
-- Supabase gives the client no way to tell (email-code accounts and password
-- accounts look the same). Changing a password needs the current one, so the
-- API has to know whether there is one. Service role only.

create or replace function public.d1_has_password(p_user uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce((select encrypted_password <> '' from auth.users where id = p_user), false);
$$;

revoke all on function public.d1_has_password(uuid) from public, anon, authenticated;
grant execute on function public.d1_has_password(uuid) to service_role;
