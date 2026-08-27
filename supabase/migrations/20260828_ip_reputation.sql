-- IP reputation tags — VPN, Tor, datacenter, and Apple Private Relay.
--
-- A second, independent signal from bot detection. is_bot (see
-- 20260827_engagement_events.sql / lib/botDetect.ts) reads the user-agent and
-- asks "is this a machine fetching a preview?". This asks a different
-- question — "is this connection routed through something that isn't the
-- visitor's own network?" — which a normal-looking browser UA can't answer on
-- its own. A datacenter IP presenting an ordinary Chrome UA is a much
-- stronger automation signal than the UA alone; a VPN or Tor connection
-- presenting an ordinary UA is very likely still a real person, just a
-- privacy-conscious one. So this TAGS — it never reclassifies is_bot, and it
-- never blocks a click. Same "flag, don't drop" instinct as botDetect.ts,
-- applied to a different axis.
--
-- Four public range lists, all measured before this was written:
--   tor                 ~1,400 IPs     torproject.org's official bulk exit list
--   vpn                 ~11,000 CIDRs  X4BNet/lists_vpn — known commercial VPN netblocks
--   datacenter          ~43,000 CIDRs  X4BNet/lists_vpn — cloud/hosting, "not an eyeball network"
--   apple_private_relay ~290,000 CIDRs Apple's own published iCloud Private Relay egress ranges
--
-- ~345,000 rows sounds large as a download; it is a trivial size as a
-- Postgres table — a few MB with its index. No need to collapse to parent
-- supernets: that would throw away Apple's precision for no real storage or
-- query-time saving, since a GiST containment lookup costs the same either way.
--
-- One caveat worth stating plainly rather than burying: X4BNet's lists_vpn
-- repository carries no LICENSE file. Its README explicitly invites
-- contribution and the list exists for exactly this kind of defensive/
-- detection use, but nothing formalises reuse terms. Used here for internal
-- tagging only — the ranges are never re-published or served back out.
--
-- Apple Private Relay wins over a coincidental VPN/datacenter match: it's the
-- benign, extremely common explanation (default-on for iCloud+ subscribers),
-- and "Private Relay" is a far more useful label than "VPN" for a click that
-- is almost certainly a real congregation member on their phone.

-- Containment lookups ("which range, if any, contains this IP") need a GiST
-- index, not a btree — btree can't do "is X inside this CIDR" efficiently.
-- btree_gist makes ordinary types (including inet/cidr) indexable under GiST;
-- it's a standard bundled Postgres extension, not third-party.
create extension if not exists btree_gist;

-- The lists themselves, refreshed periodically. One row per CIDR per category.
create table if not exists ip_reputation_ranges (
  cidr       cidr not null,
  category   text not null check (category in ('tor', 'vpn', 'datacenter', 'apple_private_relay')),
  source     text not null,
  -- Every refresh writes a fresh batch_id, then deletes anything from the same
  -- category+source left over from the previous batch. This is the swap: no
  -- window where the table is empty mid-refresh, and no manual truncate.
  batch_id   uuid not null,
  created_at timestamptz not null default now(),
  primary key (category, source, cidr)
);

create index if not exists ip_reputation_ranges_cidr_idx
  on ip_reputation_ranges using gist (cidr inet_ops);

-- Batch-swap cleanup scans "everything from this source not in the latest
-- batch" — an index on the columns that query filters by keeps that cheap
-- even while the old and new batches briefly coexist.
create index if not exists ip_reputation_ranges_batch_idx
  on ip_reputation_ranges (source, batch_id);

alter table ip_reputation_ranges enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ip_reputation_ranges'
      and policyname = 'service only'
  ) then
    create policy "service only" on ip_reputation_ranges using (false) with check (false);
  end if;
end $$;

-- The tag itself, added to the table carrying every other click dimension.
-- Nullable: most visitors match nothing, and null reads as "ordinary
-- connection" rather than needing a fifth enum value for it.
alter table engagement_events
  add column if not exists ip_category text
  check (ip_category in ('tor', 'vpn', 'datacenter', 'apple_private_relay'));

create index if not exists engagement_events_ip_category_idx
  on engagement_events (ip_category, created_at desc)
  where ip_category is not null;

-- Computed once, at write time, in a trigger rather than in application
-- code — so it's correct no matter which of the two write paths (the
-- redirect page, the /api/track beacon) inserts the row, and so a lookup
-- failure can never fail the insert itself (the exception handler falls back
-- to null — the same "never break the thing the visitor was doing" rule
-- lib/engagement.server.ts's recordEngagement() follows).
create or replace function engagement_events_tag_ip_category()
returns trigger
language plpgsql
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

drop trigger if exists engagement_events_ip_category on engagement_events;
create trigger engagement_events_ip_category
  before insert on engagement_events
  for each row execute function engagement_events_tag_ip_category();


-- ── Extending the rollup with a Connection breakdown ────────────────────────
--
-- engagement_top()'s column allowlist (20260827_engagement_events.sql) gains
-- ip_category; engagement_rollup() gains a byIpCategory bucket alongside
-- byDevice/byBrowser — same shape, one more dimension. Both are re-created
-- (create or replace) rather than migrated in place, since Postgres has no
-- ALTER FUNCTION for a function body.

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
    'utm_source', 'utm_medium', 'utm_campaign', 'ip_category'
  ) then
    raise exception 'engagement_top: unsupported column %', p_column;
  end if;

  execute format($f$
    select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
    from (
      select
        %1$I::text as key,
        count(*)                     as events,
        count(distinct visitor_hash) as visitors,
        %2$s                         as label
      from engagement_events
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
    where (p_since is null or created_at >= p_since)
      and (p_until is null or created_at <= p_until)
      and (p_source is null or source = p_source)
      and (p_target is null or target_key = p_target)
      and (p_include_bots or is_bot = false)
  ),
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
      'visitors', (select count(distinct visitor_hash) from scoped),
      'targets',  (select count(distinct target_key) from scoped),
      'bots',     (select n from bots)
    ),
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
    'bySource',     engagement_top(p_since, p_until, p_source, p_target, p_include_bots, 'source'),
    'byTarget',     engagement_top(p_since, p_until, p_source, p_target, p_include_bots, 'target_key'),
    'byCountry',    engagement_top(p_since, p_until, p_source, p_target, p_include_bots, 'country'),
    'byReferrer',   engagement_top(p_since, p_until, p_source, p_target, p_include_bots, 'referrer_host'),
    'byDevice',     engagement_top(p_since, p_until, p_source, p_target, p_include_bots, 'device'),
    'byBrowser',    engagement_top(p_since, p_until, p_source, p_target, p_include_bots, 'browser'),
    'bySrcTag',     engagement_top(p_since, p_until, p_source, p_target, p_include_bots, 'src_tag'),
    'byIpCategory', engagement_top(p_since, p_until, p_source, p_target, p_include_bots, 'ip_category')
  );
$$;

revoke all on function engagement_rollup(timestamptz, timestamptz, text, text, boolean) from public;
revoke all on function engagement_top(timestamptz, timestamptz, text, text, boolean, text, int) from public;
grant execute on function engagement_rollup(timestamptz, timestamptz, text, text, boolean) to service_role;
