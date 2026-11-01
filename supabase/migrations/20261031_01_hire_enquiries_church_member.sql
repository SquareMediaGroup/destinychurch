-- Hire form: "Are you a Destiny Church member?" (app/hire/HireForm.tsx).
-- app/hire/actions.ts has written church_member since the question was added,
-- and the live database already has the column, but no migration ever created
-- it — so a database built from these migrations (a branch, a restore, local
-- dev) rejected every hire enquiry with "column church_member does not exist".
-- A no-op where the column is already there.

alter table public.hire_enquiries
  add column if not exists church_member text;
