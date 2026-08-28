-- Advisor cleanup for 20260828_ip_reputation.sql, following the same pattern
-- as 20260711_03_security_advisor_cleanup.sql: ship the migration, run
-- get_advisors, fix what it finds in a follow-up. Three real findings here,
-- not cosmetic:
--
-- 1. Supabase grants EXECUTE on a newly created function directly to `anon`
--    and `authenticated` at creation time — NOT via the `PUBLIC` pseudo-role.
--    `revoke all on function ... from public` in the previous migration
--    therefore did nothing to those grants, and engagement_rollup,
--    engagement_top and engagement_anonymise_ips were left callable by
--    anyone on the internet via /rest/v1/rpc/<name>, including
--    engagement_anonymise_ips — a data-mutating function. Fixed by revoking
--    from anon/authenticated explicitly, the same two roles the advisor
--    named.
-- 2. engagement_events_tag_ip_category() was missing `set search_path`,
--    unlike every other function in this feature — a mutable search_path is
--    flagged regardless of security-definer status.
-- 3. btree_gist was installed into `public` rather than the project's
--    existing `extensions` schema, where pgcrypto/uuid-ossp/pg_stat_statements
--    already live.

revoke execute on function engagement_rollup(timestamptz, timestamptz, text, text, boolean)
  from anon, authenticated;
revoke execute on function engagement_top(timestamptz, timestamptz, text, text, boolean, text, int)
  from anon, authenticated;
revoke execute on function engagement_anonymise_ips(int)
  from anon, authenticated;

create or replace function engagement_events_tag_ip_category()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.ip is not null then
    begin
      select category into new.ip_category
        from ip_reputation_ranges
       where new.ip::inet <<= cidr
       order by (category = 'apple_private_relay') desc, masklen(cidr) desc
       limit 1;
    exception when others then
      new.ip_category := null;
    end;
  end if;
  return new;
end;
$$;

-- ALTER EXTENSION ... SET SCHEMA relocates the extension's objects in place —
-- unlike drop-then-recreate, it does not touch ip_reputation_ranges_cidr_idx,
-- which depends on the gist_inet_ops operator class this extension provides.
-- btree_gist is marked relocatable, so this is supported directly.
alter extension btree_gist set schema extensions;
