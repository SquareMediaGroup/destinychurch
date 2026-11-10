-- Remove the tables left behind by DestinyAI for Destiny Admin.
--
-- 20261105_01 created admin_agent_plans / admin_agent_actions for the
-- plan-and-confirm assistant at /admin/assistant. That feature was removed in
-- #189 (two days later) and nothing reads or writes them. Both were empty when
-- this was written (checked 2026-11-10).
--
-- The starts_at / ends_at columns the same migration added to site_banner and
-- site_popup are still used and stay.
--
-- Not covered here, because SQL can't do it: the public `builder-media`
-- storage bucket left by the page builder (removed in 20260711_06). Its 16
-- files are from May 2026 and nothing in the database links to them. Delete it
-- from the Supabase dashboard (Storage > builder-media > Delete bucket).

drop table if exists public.admin_agent_actions;
drop table if exists public.admin_agent_plans;
