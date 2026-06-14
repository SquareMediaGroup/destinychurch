-- Administration → staff backend logins
--
-- Links a staff directory record to its Supabase Auth user so a person's
-- backend login (email + password) can be created/managed/deleted alongside
-- their staff record. The roles that grant access to each system (Site Editor
-- vs Administration) live in the auth user's app_metadata.roles — this column
-- is just the link. ON DELETE SET NULL so deleting the auth user never orphans
-- or deletes the HR record.

alter table hr_staff
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create index if not exists hr_staff_auth_user_idx on hr_staff (auth_user_id);
