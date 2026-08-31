-- Close the TOCTOU race on "don't remove the last Super Admin": the app-level
-- check (count super admins, then update/delete) is two round trips, so two
-- concurrent requests demoting/deleting two different super admins when
-- exactly two remain can both pass the check before either write lands,
-- leaving zero. A trigger enforces the invariant inside the same
-- transaction as the write, taking a table lock first so concurrent
-- transactions against this (small, rarely-written) table serialize instead
-- of racing.
create or replace function enforce_last_super_admin()
returns trigger
language plpgsql
as $$
begin
  lock table admin_roles in share row exclusive mode;

  if (tg_op = 'DELETE' and old.super_admin) or
     (tg_op = 'UPDATE' and old.super_admin and not new.super_admin) then
    if (select count(*) from admin_roles where super_admin = true) = 0 then
      raise exception 'Can''t remove Super Admin from the last remaining Super Admin.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_last_super_admin on admin_roles;
create trigger trg_enforce_last_super_admin
  before update or delete on admin_roles
  for each row
  execute function enforce_last_super_admin();
