-- Destiny One: message encryption keys in Supabase Vault (decided 2026-10-06,
-- replacing Vercel env variables; see lib/destinyOne/crypto.server.ts).
--
-- The keys are generated here, inside the database, so they never pass
-- through a laptop, a chat or a CI log:
--   d1_msg_keys         "v1:<base64 32 bytes>"  (comma-separated during a rotation)
--   d1_msg_key_current  "v1"
--   d1_search_key       "<base64 32 bytes>"
-- Vault stores them encrypted; its own key isn't in the database or its
-- backups, so a dump or backup still shows only ciphertext. Anyone with full
-- SQL access or the service key could fetch them through d1_message_keyring(),
-- a trade-off accepted for keeping everything in Supabase.
--
-- Rotation: add ",v2:<new key>" to d1_msg_keys, then set d1_msg_key_current to
-- "v2" (vault.update_secret). Servers pick it up within 10 minutes. Never
-- remove an old key while anything sealed with it is still stored. The search
-- key can't be rotated without rebuilding d1_message_terms.
--
-- Safe to run again: existing secrets are left alone.

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'd1_msg_keys') then
    perform vault.create_secret('v1:' || encode(extensions.gen_random_bytes(32), 'base64'), 'd1_msg_keys',
      'Destiny One message encryption keys, id:base64, comma-separated');
  end if;
  if not exists (select 1 from vault.secrets where name = 'd1_msg_key_current') then
    perform vault.create_secret('v1', 'd1_msg_key_current', 'Destiny One: the key id new messages are sealed with');
  end if;
  if not exists (select 1 from vault.secrets where name = 'd1_search_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'base64'), 'd1_search_key',
      'Destiny One blind search index HMAC key (never used for encryption)');
  end if;
end;
$$;

create or replace function public.d1_message_keyring()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'keys', (select decrypted_secret from vault.decrypted_secrets where name = 'd1_msg_keys'),
    'current', (select decrypted_secret from vault.decrypted_secrets where name = 'd1_msg_key_current'),
    'search', (select decrypted_secret from vault.decrypted_secrets where name = 'd1_search_key')
  );
$$;

comment on function public.d1_message_keyring() is
  'Destiny One message encryption keys from Vault, for the API (service role only).';

revoke all on function public.d1_message_keyring() from public, anon, authenticated;
grant execute on function public.d1_message_keyring() to service_role;
