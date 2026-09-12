-- The Sermons access level: /admin/sermons and its API — publishing audio to
-- Buzzsprout. Follows the same shape as design_admin (and the removed
-- media_admin) — one boolean per access level, read by lib/adminRoles.ts's
-- getRoles.
--
-- getRoles spells its column list out rather than selecting *, so this column
-- has to be added there by hand as well. Forgetting that line makes the role
-- read as false for everyone with no error anywhere.

alter table public.admin_roles
  add column if not exists sermon_admin boolean not null default false;

comment on column public.admin_roles.sermon_admin is
  'Can reach /admin/sermons and /api/admin/sermons — publishing audio to Buzzsprout.';
