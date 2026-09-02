-- Every hr_staff row must be linked to at most one login, and (once
-- 20260902182651 lands) exactly one. Prevents two staff records from
-- accidentally sharing the same auth user.
alter table hr_staff
  add constraint hr_staff_auth_user_id_key unique (auth_user_id);
