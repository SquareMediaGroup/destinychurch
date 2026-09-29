-- Destiny One part 7: rate limits shared by every server instance.
--
-- lib/rateLimit.ts counts in memory, so on Vercel each serverless instance
-- has its own count and a determined spammer spread across instances barely
-- notices. The Destiny One API (lib/destinyOne/http.ts `limit`) now also asks
-- the database, which every instance shares: one row per key per minute,
-- counted atomically.

create table if not exists public.d1_rate_limits (
  key text not null check (char_length(key) between 1 and 200),
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (key, window_start)
);

alter table public.d1_rate_limits enable row level security;
drop policy if exists "service only" on public.d1_rate_limits;
create policy "service only" on public.d1_rate_limits using (false) with check (false);

comment on table public.d1_rate_limits is
  'Destiny One API rate-limit counters: one row per key per minute. Short-lived; old rows are pruned by d1_rate_limit itself.';

-- Records one hit for `p_key` in the current minute and says whether it is
-- still within `p_max`. true = allowed.
create or replace function public.d1_rate_limit(p_key text, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  win timestamptz := date_trunc('minute', now());
  n integer;
begin
  insert into public.d1_rate_limits (key, window_start, hits)
    values (p_key, win, 1)
    on conflict (key, window_start) do update set hits = public.d1_rate_limits.hits + 1
    returning hits into n;

  -- Keep the table small without a cron job: now and then, drop old minutes.
  if random() < 0.01 then
    delete from public.d1_rate_limits where window_start < now() - interval '1 hour';
  end if;

  return n <= p_max;
end;
$$;

revoke all on function public.d1_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.d1_rate_limit(text, integer) to service_role;
