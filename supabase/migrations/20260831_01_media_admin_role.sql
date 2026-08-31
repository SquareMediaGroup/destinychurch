-- Adds the Media Team access level to admin_roles.
--
-- Media Team owns the /media photo gallery: boards, and the moderation queue
-- for photos the public uploads.
--
-- The column defaults to false, so this grants nobody anything on its own.
-- RLS is untouched: admin_roles is already deny-all with service-key-only
-- access, and lib/adminRoles.ts reads it through createServiceClient().

alter table public.admin_roles
  add column if not exists media_admin boolean not null default false;

comment on column public.admin_roles.media_admin is
  'Can reach /admin/media and /api/admin/media. Checked by lib/adminRoles.ts.';
