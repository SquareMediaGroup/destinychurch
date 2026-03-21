create table if not exists redirects (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  target_url text not null,
  label text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Allow public read access to active redirects
alter table redirects enable row level security;

create policy "Public can read active redirects"
  on redirects for select
  using (active = true);

create policy "Service role has full access"
  on redirects for all
  using (true);
