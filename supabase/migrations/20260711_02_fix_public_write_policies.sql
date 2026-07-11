-- SECURITY FIX: remove anon/public write access to `redirects` and `alpha_events`.
--
-- Both tables carried a policy named "Service role has full access" defined as
-- `for ALL to public using (true)` (with_check defaulting to the using clause).
-- Because `to public` covers the anon and authenticated roles — and Supabase's
-- default grants give those roles INSERT/UPDATE/DELETE — this let ANYONE holding
-- the public anon/publishable key write to these tables via the REST API.
--
-- Impact (redirects): `app/[slug]/page.tsx` resolves an active redirect and does
-- `redirect(target_url)`, so an attacker could INSERT `{slug, target_url, active}`
-- to turn any path into an open redirect to a phishing site, or overwrite/delete
-- existing redirects. Impact (alpha_events): tamper with or delete Alpha events.
--
-- The policy was also pointless: the service_role / secret key bypasses RLS
-- entirely, so admin CRUD (which uses the service client) and the public read
-- path (also service client) are unaffected by removing it. The remaining
-- "Public can read active …" SELECT policies keep legitimate public reads working.
-- Once the permissive ALL policy is gone, RLS default-denies anon writes even
-- though the table-level grant still exists — matching every other table here.

drop policy if exists "Service role has full access" on public.redirects;
drop policy if exists "Service role has full access" on public.alpha_events;

-- Belt-and-braces: lock the deny-all default for non-service roles so a future
-- reviewer sees the intent explicitly (service_role still bypasses RLS).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='redirects' and policyname='service writes only'
  ) then
    create policy "service writes only" on public.redirects
      for all to anon, authenticated using (false) with check (false);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='alpha_events' and policyname='service writes only'
  ) then
    create policy "service writes only" on public.alpha_events
      for all to anon, authenticated using (false) with check (false);
  end if;
end $$;
