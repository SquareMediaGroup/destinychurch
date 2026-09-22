-- Lock down the live chat SECURITY DEFINER functions.
--
-- 20260817_live_chat.sql created three SECURITY DEFINER functions in `public`
-- and never revoked Postgres' default EXECUTE-to-PUBLIC, so the security
-- advisor (lints 0028/0029) flagged all three as callable by anon and
-- authenticated straight through /rest/v1/rpc:
--
--   live_chat_purge   — anyone could delete the chat history.
--   live_chat_emit    — anyone could push arbitrary events onto any chat topic,
--                       sidestepping the "no broadcast INSERT" rule the
--                       realtime.messages policies exist to enforce.
--   is_live_chat_host — low risk (only reports on the caller), but still an
--                       exposed definer function.
--
-- Who actually needs EXECUTE:
--   live_chat_emit    lib/liveChat.server.ts emit(), via createServiceClient()
--                     → service_role only.
--   live_chat_purge   app/api/cron/live-chat-purge, via createServiceClient()
--                     → service_role only.
--   is_live_chat_host the live_chat_host_receive policy on realtime.messages,
--                     which Realtime evaluates *as the subscriber*. That policy
--                     is `to authenticated`, so authenticated needs EXECUTE;
--                     anon never reaches it.
--
-- Revoking from authenticated isn't an option for is_live_chat_host, so it
-- moves to a `private` schema instead. PostgREST only exposes `public` (and
-- graphql_public), so it drops off /rest/v1/rpc while the policy keeps working
-- — policies hold the function's OID, not its name, so SET SCHEMA carries the
-- policy along with it.

-- ── Server-only functions ──────────────────────────────────────────────────

revoke all on function public.live_chat_emit(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.live_chat_emit(text, text, jsonb) to service_role;

revoke all on function public.live_chat_purge(integer) from public, anon, authenticated;
grant execute on function public.live_chat_purge(integer) to service_role;

-- ── Policy helper → private schema ─────────────────────────────────────────

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

alter function public.is_live_chat_host() set schema private;

revoke all on function private.is_live_chat_host() from public, anon;
grant execute on function private.is_live_chat_host() to authenticated, service_role;

comment on function private.is_live_chat_host() is
  'True when the signed-in user holds the host (or super_admin) access level. Used by the live_chat_host_receive policy on realtime.messages. Lives in `private` so it is not callable via /rest/v1/rpc.';
