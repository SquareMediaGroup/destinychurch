-- Follow-up hardening for the two functions added in this session's
-- migrations, per get_advisors(security):
--
-- 1. decrement_variant_stock is SECURITY DEFINER and was exposed to anon/
--    authenticated via PostgREST RPC — anyone could call it directly to
--    manipulate stock outside the checkout flow. It's only ever called
--    server-side (lib/checkout.server.ts) with the service-role client,
--    which bypasses grants anyway, so revoke public/anon/authenticated
--    execute and leave only service_role.
-- 2. enforce_last_super_admin (trigger function) had a mutable search_path;
--    pin it like decrement_variant_stock already has.

revoke execute on function decrement_variant_stock(uuid, integer) from public;
revoke execute on function decrement_variant_stock(uuid, integer) from anon;
revoke execute on function decrement_variant_stock(uuid, integer) from authenticated;
grant execute on function decrement_variant_stock(uuid, integer) to service_role;

alter function enforce_last_super_admin() set search_path = public;
