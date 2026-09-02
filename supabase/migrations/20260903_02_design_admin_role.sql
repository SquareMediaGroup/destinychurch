-- The Design Team access level: /admin/design and its API. Follows the same
-- shape as the hr_admin and (now removed) media_admin columns — one boolean per
-- access level, read by lib/adminRoles.ts's getRoles.
--
-- getRoles spells its column list out rather than selecting *, so this column
-- has to be added there by hand as well. Forgetting that line makes the role
-- read as false for everyone with no error anywhere; tests/unit/design-access
-- .spec.ts is what catches it.

alter table public.admin_roles
  add column if not exists design_admin boolean not null default false;

comment on column public.admin_roles.design_admin is
  'Can reach /admin/design and /api/admin/design — the design ticket queue.';
