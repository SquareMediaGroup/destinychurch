create table if not exists alpha_events (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('alpha', 'youth_alpha')),
  start_date date not null,
  signup_url text not null,
  location text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table alpha_events enable row level security;

create policy "Public can read active events"
  on alpha_events for select
  using (active = true);

create policy "Service role has full access"
  on alpha_events for all
  using (true);

-- Index for faster queries
create index idx_alpha_events_type_active on alpha_events(type, active);
