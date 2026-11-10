-- A rate limit every server instance shares, for the website's public forms.
--
-- lib/rateLimit.ts counts in each serverless instance's own memory, so on
-- Vercel a caller who lands on several instances gets several allowances: it
-- slows abuse, it doesn't cap it. Destiny One already keeps its counts in the
-- database (d1_rate_limit, 20260928_03) but only per minute. This is the same
-- idea with a window the caller chooses, so "5 an hour" and "20 per 15
-- minutes" can be said as well as "15 a minute".
--
-- Keys never hold an IP or email address as typed: lib/rateLimit.ts hashes
-- them first.

create table if not exists public.rate_limits (
  key text not null check (char_length(key) between 1 and 200),
  window_start timestamptz not null,
  expires_at timestamptz not null,
  hits integer not null default 1,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;
drop policy if exists "service only" on public.rate_limits;
create policy "service only" on public.rate_limits using (false) with check (false);

comment on table public.rate_limits is
  'Shared rate-limit counters for the website: one row per key per window. Short-lived; expired rows are pruned by rate_limit_hit itself.';

-- Records one hit for `p_key` in the current window of `p_window_seconds` and
-- says whether it is still within `p_max`. true = allowed.
create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  secs integer := least(greatest(coalesce(p_window_seconds, 60), 1), 86400);
  win timestamptz := to_timestamp(floor(extract(epoch from now()) / secs) * secs);
  n integer;
begin
  insert into public.rate_limits (key, window_start, expires_at, hits)
    values (p_key, win, win + make_interval(secs => secs), 1)
    on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
    returning hits into n;

  -- Keep the table small without a cron job: now and then, drop finished windows.
  if random() < 0.01 then
    delete from public.rate_limits where expires_at < now();
  end if;

  return n <= p_max;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
