-- The posting-restriction trigger function is only ever called by its two
-- triggers (20261011_01). Without this, the API's /rpc/ endpoint lists it as
-- callable by anon and signed-in users. Triggers keep firing: Postgres checks
-- EXECUTE when a trigger is created, not each time it fires.

revoke execute on function public.d1_enforce_posting_restriction() from public, anon, authenticated;
