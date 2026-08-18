-- Adds the Host access level to admin_roles.
--
-- Hosts run the chat on /live: they sign in through a popup on the page itself
-- (never redirected to /login), get a HOST badge next to their messages, and can
-- approve held messages, delete, mute, pause and close the room.
--
-- The column defaults to false, so this grants nobody anything on its own — the
-- backfill in 20260807_admin_roles.sql already made every pre-existing user a
-- super_admin, and super_admin passes the host check anyway. Hosts are ticked on
-- per user in /admin/users.
--
-- RLS is untouched: admin_roles is already deny-all with service-key-only
-- access, and lib/adminRoles.ts reads it through createServiceClient().

alter table public.admin_roles
  add column if not exists host boolean not null default false;

comment on column public.admin_roles.host is
  'Can moderate the live chat on /live and reach /admin/live-chat. Checked by lib/adminRoles.ts and public.is_live_chat_host().';
