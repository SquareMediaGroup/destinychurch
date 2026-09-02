-- Backend access (a linked auth login) is now mandatory for every staff
-- record from creation onward -- there is no more "no login" or "revoke
-- access" state. The link may point at a staff-only login or at an
-- existing admin's login (see lib/staffLogins.ts); either way it must be
-- present. Safe to apply now: the only pre-existing hr_staff rows (a
-- placeholder and one linked to an admin identity) were removed first.
alter table hr_staff
  alter column auth_user_id set not null;
