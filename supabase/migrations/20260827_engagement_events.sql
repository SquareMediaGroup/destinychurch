-- Engagement events — one row every time someone follows something we published.
--
-- The church prints vanity URLs on flyers, encodes them in NFC tags on the seat
-- backs, and shares them in WhatsApp groups. Until now none of that was
-- measurable: `redirects` stored slug → target_url and app/[slug]/page.tsx
-- redirected without writing anything, so "did the Alpha flyer work?" had no
-- answer at all.
--
-- Why our own table rather than Vercel Analytics: a redirect never renders
-- HTML, so <Analytics /> never loads and the hop is invisible to it. Vercel
-- also caps its reporting window by plan (1 month on Hobby), and a printed
-- flyer has a life measured in years. This table has no ceiling and no window.
--
-- ONE table for all three surfaces rather than three. A shortlink click, an NFC
-- tap and a /links card press are the same event — someone followed something
-- we published — and one table means one index strategy, one purge job, and one
-- query behind /admin/analytics.
--
-- Written exclusively by recordEngagement() in lib/engagement.server.ts, read
-- only by Site Admins and Super Admins through /admin/analytics.

create table if not exists engagement_events (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),

  -- Which surface: 'redirect' | 'nfc' | 'links'. Kept as text rather than an
  -- enum so adding a fourth surface is an app change, not a migration.
  source       text not null,
  -- The thing followed: the redirect slug, the nfc_tiles id, the /links href.
  target_key   text not null,
  -- The human name of it, captured now — "Alpha Sign Up", not a uuid. A
  -- renamed or deleted target keeps the name it had when it was clicked.
  target_label text,

  -- `on delete set null`, deliberately NOT cascade. Deleting a redirect must
  -- not erase the record of how it performed — that history is often exactly
  -- why someone is looking. target_key/target_label carry the slug regardless.
  redirect_id  uuid references redirects(id) on delete set null,

  -- ── Where from ──────────────────────────────────────────────────────────
  -- Vercel's x-vercel-ip-* headers, read in the handler (middleware doesn't
  -- match /[slug]). `region` is the ISO 3166-2 fragment, so UK visitors read
  -- as ENG/SCT/WLS/NIR rather than a county.
  country       text,
  region        text,
  city          text,
  -- Host only for grouping ("facebook.com"), full URL kept for the detail view.
  referrer_host text,
  referrer_url  text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  -- ?s=qr from a printed QR code, ?s=nfc from a tag. This is the column that
  -- separates "scanned the flyer" from "clicked the link we posted" — the
  -- question the church actually asks about print spend.
  src_tag       text,

  -- ── What on ─────────────────────────────────────────────────────────────
  device     text,
  os         text,
  browser    text,
  user_agent text,

  -- Flagged, never dropped.
  --
  -- Post a shortlink in a church WhatsApp group and every member's phone
  -- fetches a link preview. Those are not clicks. But deleting them would make
  -- a genuinely popular link look broken with no way to tell, so the row is
  -- written and marked; the page hides bots by default and can show them.
  is_bot boolean not null default false,

  -- ── Who (pseudonymous) ──────────────────────────────────────────────────
  -- The raw IP, anonymised in place by engagement_anonymise_ips() after
  -- ANALYTICS_IP_RETENTION_DAYS (default 90) — see the cron at
  -- app/api/cron/analytics-anonymise/route.ts.
  ip               text,
  ip_anonymised_at timestamptz,

  -- sha256(ip + user_agent + ANALYTICS_HASH_SALT), not reversible, and it
  -- deliberately OUTLIVES the raw IP. Uniques are counted from this column, so
  -- ageing out a 90-day-old IP doesn't retroactively collapse last quarter's
  -- visitor numbers — which counting `distinct ip` would have done.
  --
  -- Caveat worth knowing when reading the numbers: on a Sunday the whole
  -- congregation shares the church WiFi's single NAT IP, so this under-counts
  -- uniques for /nfc. Taps are the honest metric there, and the page leads
  -- with taps on that tab for exactly this reason.
  visitor_hash text
);

alter table engagement_events enable row level security;

-- Service-only, same as audit_log. Writes go through createServiceClient();
-- nothing anon or authenticated may read or write. Note `redirects` itself is
-- publicly readable (active rows only) — this log is not.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'engagement_events'
      and policyname = 'service only'
  ) then
    create policy "service only" on engagement_events using (false) with check (false);
  end if;
end $$;

-- Every read is "this range, newest first, filtered by one dimension", so each
-- index is (column, created_at desc) — the filter and the ordering are served
-- by the same scan. Same shape as the audit_log indexes.
create index if not exists engagement_events_created_at_idx
  on engagement_events (created_at desc);
create index if not exists engagement_events_source_idx
  on engagement_events (source, created_at desc);
create index if not exists engagement_events_target_idx
  on engagement_events (target_key, created_at desc);
create index if not exists engagement_events_redirect_idx
  on engagement_events (redirect_id, created_at desc);

-- The default view of every page excludes bots, so that slice gets its own
-- partial index rather than filtering a full scan on each request.
create index if not exists engagement_events_human_idx
  on engagement_events (created_at desc) where is_bot = false;


-- ── Aggregation ───────────────────────────────────────────────────────────
--
-- Aggregating in Postgres rather than in JS, unlike the audit log's capped
-- 2000-row facet scan (app/api/admin/audit/route.ts). There the counts are a
-- navigation aid and "500+" is a fine answer; here the numbers ARE the product.
-- An approximate click count is a wrong click count, and click volume has no
-- upper bound the way a week of admin edits does.

-- Top values for one dimension. Defined BEFORE engagement_rollup, which calls
-- it: Postgres validates function bodies at creation, so the callee has to
-- exist first.
--
-- p_column is checked against a fixed allowlist rather than interpolated blind.
-- This runs as security definer, so an unchecked identifier here would be an
-- injection point reachable from the admin API.
create or replace function engagement_top(
  p_since        timestamptz,
  p_until        timestamptz,
  p_source       text,
  p_target       text,
  p_include_bots boolean,
  p_column       text,
  p_limit        int default 12
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if p_column not in (
    'source', 'target_key', 'country', 'region', 'city',
    'referrer_host', 'device', 'os', 'browser', 'src_tag',
    'utm_source', 'utm_medium', 'utm_campaign'
  ) then
    raise exception 'engagement_top: unsupported column %', p_column;
  end if;

  -- target_label belongs to the target, so it is only meaningful when grouping
  -- BY the target. Carrying it on every dimension would label the "mobile" row
  -- with whichever target happened to sort last — a caption that looks like
  -- data and isn't.
  execute format($f$
    select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    from (
      select
        %1$I::text as key,
        count(*)                     as events,
        count(distinct visitor_hash) as visitors,
        %2$s                         as label
      from engagement_events
      -- $1/$2 are nullable: p_since is null for "all time" and p_until
      -- defaults to now() but a caller could still pass null explicitly.
      -- `created_at >= null` is never true in SQL, so an unguarded bound here
      -- would make "all time" silently return zero rows for every dimension.
      where ($1 is null or created_at >= $1)
        and ($2 is null or created_at <= $2)
        and ($3 is null or source = $3)
        and ($4 is null or target_key = $4)
        and ($5 or is_bot = false)
        and %1$I is not null
      group by 1
      order by count(*) desc
      limit $6
    ) t
  $f$, p_column,
       case when p_column = 'target_key' then 'max(target_label)' else 'null::text' end)
  into result
  using p_since, p_until, p_source, p_target, p_include_bots, p_limit;

  return result;
end;
$$;

-- The whole page in one round trip. Returns jsonb rather than several result
-- sets so /api/admin/analytics is a single RPC call.
create or replace function engagement_rollup(
  p_since        timestamptz,
  p_until        timestamptz default now(),
  p_source       text default null,
  p_target       text default null,
  p_include_bots boolean default false
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with scoped as (
    select *
    from engagement_events
    -- p_since is null for "all time" (lib/audit.ts's rangeStart() returns
    -- null for that range) and p_until could in principle be passed null too
    -- — `created_at >= null` is never true, so both bounds have to be guarded
    -- or "all time" would silently come back as "nothing".
    where (p_since is null or created_at >= p_since)
      and (p_until is null or created_at <= p_until)
      and (p_source is null or source = p_source)
      and (p_target is null or target_key = p_target)
      and (p_include_bots or is_bot = false)
  ),
  -- Counted separately so the "N bot hits filtered out" line on the page stays
  -- honest even though the main figures exclude them.
  bots as (
    select count(*) as n
    from engagement_events
    where (p_since is null or created_at >= p_since)
      and (p_until is null or created_at <= p_until)
      and (p_source is null or source = p_source)
      and (p_target is null or target_key = p_target)
      and is_bot = true
  )
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'events',   (select count(*) from scoped),
      -- distinct visitor_hash, never distinct ip: the IP is nulled at 90 days
      -- and counting it would make last quarter's uniques collapse to zero.
      'visitors', (select count(distinct visitor_hash) from scoped),
      'targets',  (select count(distinct target_key) from scoped),
      'bots',     (select n from bots)
    ),
    -- Days are bucketed in Europe/London, not UTC. A click at 23:30 on a
    -- British Summer Time Sunday is a Sunday click; in UTC it would land on
    -- Monday and quietly move the service-day spike the church looks for.
    'timeseries', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.day)
      from (
        select
          date_trunc('day', created_at at time zone 'Europe/London')::date as day,
          count(*)                     as events,
          count(distinct visitor_hash) as visitors
        from scoped
        group by 1
      ) t
    ), '[]'::jsonb),
    'bySource',   engagement_top(p_since, p_until, p_source, p_target, p_include_bots, 'source'),
    'byTarget',   engagement_top(p_since, p_until, p_source, p_target, p_include_bots, 'target_key'),
    'byCountry',  engagement_top(p_since, p_until, p_source, p_target, p_include_bots, 'country'),
    'byReferrer', engagement_top(p_since, p_until, p_source, p_target, p_include_bots, 'referrer_host'),
    'byDevice',   engagement_top(p_since, p_until, p_source, p_target, p_include_bots, 'device'),
    'byBrowser',  engagement_top(p_since, p_until, p_source, p_target, p_include_bots, 'browser'),
    'bySrcTag',   engagement_top(p_since, p_until, p_source, p_target, p_include_bots, 'src_tag')
  );
$$;


-- ── Retention ─────────────────────────────────────────────────────────────
--
-- The raw IP is the only column here that identifies a person, so it is the
-- only one with a clock on it. Everything else — the click, the country, the
-- referrer, the device — is kept indefinitely, because a flyer printed in 2026
-- is still worth comparing against in 2028.
--
-- Called nightly by app/api/cron/analytics-anonymise/route.ts. Note this
-- UPDATEs rather than DELETEs: the row keeps counting, it just stops being
-- personal data. visitor_hash survives, so uniques stay correct.
create or replace function engagement_anonymise_ips(retain_days int default 90)
returns table (anonymised bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with updated as (
    update engagement_events
    set ip = null,
        ip_anonymised_at = now()
    where ip is not null
      and created_at < now() - make_interval(days => retain_days)
    returning 1 as touched
  )
  select count(*)::bigint from updated;
end;
$$;

-- These run as security definer so the service role can call them without the
-- deny-all policy applying to the aggregate itself. Nothing else should be
-- able to: revoke the default grant to public and hand it back to the roles
-- that actually call it.
revoke all on function engagement_rollup(timestamptz, timestamptz, text, text, boolean) from public;
revoke all on function engagement_top(timestamptz, timestamptz, text, text, boolean, text, int) from public;
revoke all on function engagement_anonymise_ips(int) from public;
grant execute on function engagement_rollup(timestamptz, timestamptz, text, text, boolean) to service_role;
grant execute on function engagement_anonymise_ips(int) to service_role;
