-- Health/kill-switch state for runtime services (currently Smart Search).
-- The daily health check (/api/health/smart-search) writes this row; the site
-- reads `enabled` to decide whether to show the feature.
create table if not exists service_status (
  service               text primary key,
  enabled               boolean not null default true,
  reason                text,
  last_check_at         timestamptz,
  next_check_at         timestamptz,
  consecutive_failures  int not null default 0,
  updated_at            timestamptz not null default now()
);

-- Seed the Smart Search row (enabled by default).
insert into service_status (service, enabled)
values ('smart_search', true)
on conflict (service) do nothing;

-- Only the service-role client touches this table, so enable RLS with no
-- policies — the public anon/authenticated roles get no access (consistent with
-- the rest of the schema) while the service role bypasses RLS.
alter table service_status enable row level security;
