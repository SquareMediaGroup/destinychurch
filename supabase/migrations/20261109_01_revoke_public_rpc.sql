-- Close two functions the public API key could call.
--
-- Supabase grants EXECUTE on every new function in `public` to anon and
-- authenticated by name (its default privileges), so `revoke ... from public`
-- on its own leaves both of those grants in place. The security advisor
-- (lint 0028/0029, anon/authenticated SECURITY DEFINER function executable)
-- flagged these two on 2026-11-09.
--
-- post_view_counts(): 20261020_02 revoked from public and granted to
-- service_role, intending "server only", but anyone holding the publishable
-- key could still POST /rest/v1/rpc/post_view_counts and read how many views
-- every post has had. Only lib/posts-admin.server.ts calls it, with the
-- service key.
revoke execute on function public.post_view_counts(timestamptz) from anon, authenticated;

-- admin_has_role(): needed by `authenticated` (the admin-notifications
-- realtime policy is `to authenticated` and calls it). A signed-out caller
-- only ever got `false`, but has no reason to be able to ask.
revoke execute on function public.admin_has_role(text) from anon;
