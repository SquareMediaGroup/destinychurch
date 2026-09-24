-- link_form_submissions.data holds an ordered array of { id, label, value }
-- (jsonb objects don't keep key order, so a response read back out of order).
-- 20260922_01 now creates the column with this default; this brings a database
-- that ran the earlier version of that file into line. Harmless to re-run.
alter table public.link_form_submissions alter column data set default '[]'::jsonb;
