-- Adds the HR access level to admin_roles.
--
-- HR is fully built (staff, leave, jobs, applications, documents, reviews)
-- but has been super_admin-only since it shipped. This lets a People/HR lead
-- use it without full site admin access, ahead of the launch cutover that
-- removes `unlisted: true` from its nav entries.
--
-- The column defaults to false, so this grants nobody anything on its own.
-- RLS is untouched: admin_roles is already deny-all with service-key-only
-- access, and lib/adminRoles.ts reads it through createServiceClient().

alter table public.admin_roles
  add column if not exists hr_admin boolean not null default false;

comment on column public.admin_roles.hr_admin is
  'Can reach /admin/hr and /api/admin/hr. Checked by lib/adminRoles.ts.';
