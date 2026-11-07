-- DestinyAI for Destiny Admin: scheduling windows + the plan/confirm tables.
--
-- 1. site_banner and site_popup get an optional time window. Both are read
--    with noStore() on every page load (app/layout.tsx), so "live in 2 hours,
--    gone at 3pm" needs no cron job: the row is simply outside its window
--    until it isn't. A null bound means "no limit on that side", so every
--    existing row keeps behaving exactly as before.
--
-- 2. admin_agent_plans / admin_agent_actions hold what DestinyAI *proposed*.
--    The model never writes to the site. It proposes steps, the server stores
--    them here as `pending`, and only a signed-in admin pressing Confirm runs
--    them (app/api/admin/assistant/plans/[id]/route.ts). Each executed step
--    keeps a `before` snapshot so it can be undone.
--
-- Service role only, like site_banner: nothing here is read from the browser.

alter table public.site_banner
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

alter table public.site_banner
  drop constraint if exists site_banner_window_order;
alter table public.site_banner
  add constraint site_banner_window_order
  check (starts_at is null or ends_at is null or ends_at > starts_at);

alter table public.site_popup
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

alter table public.site_popup
  drop constraint if exists site_popup_window_order;
alter table public.site_popup
  add constraint site_popup_window_order
  check (starts_at is null or ends_at is null or ends_at > starts_at);

create table if not exists public.admin_agent_plans (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  actor_email text,
  -- What the admin asked for, kept so the audit entry can quote it.
  prompt text not null,
  -- DestinyAI's one-line description of the plan.
  summary text,
  status text not null default 'pending'
    check (status in ('pending', 'executed', 'partial', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  -- A plan is a snapshot of how things looked when it was made. After this it
  -- can't be confirmed; ask again instead.
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  decided_at timestamptz
);

create index if not exists admin_agent_plans_actor_idx
  on public.admin_agent_plans (actor_id, created_at desc);

create table if not exists public.admin_agent_actions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.admin_agent_plans (id) on delete cascade,
  position int not null,
  tool text not null,
  args jsonb not null default '{}'::jsonb,
  -- Optional add-ons DestinyAI suggested ("remove it at 3pm"), each
  -- {label, changes, on_by_default}. The admin switches them on or off on the
  -- plan card; switched-on ones are merged into args when confirmed.
  follow_ups jsonb not null default '[]'::jsonb,
  -- Decided by the server (lib/adminAgent), never by the model.
  risk text not null check (risk in ('write', 'destructive')),
  label text not null,
  detail text,
  warnings jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'executed', 'failed', 'skipped', 'undone')),
  before jsonb,
  after jsonb,
  result jsonb,
  error text,
  executed_at timestamptz,
  undone_at timestamptz
);

create index if not exists admin_agent_actions_plan_idx
  on public.admin_agent_actions (plan_id, position);

alter table public.admin_agent_plans enable row level security;
alter table public.admin_agent_actions enable row level security;

revoke all on public.admin_agent_plans from anon, authenticated;
revoke all on public.admin_agent_actions from anon, authenticated;
