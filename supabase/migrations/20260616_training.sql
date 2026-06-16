-- Training module (Administration → Training, public /training)
-- Team training organised as Categories → Sub Groups → Posts.
--
-- Each Sub Group can be password-protected with a UNIQUE password, stored only
-- as a salted scrypt hash (lib/trainingAccess.ts) — never in plain text.
--
-- Access model mirrors `jobs`/`hr_*`: RLS enabled with a single service-only
-- policy. Public /training pages read published rows via the service-role
-- client in server components (lib/training.server.ts) and never expose
-- password_hash. Admin CRUD goes through service-role API routes
-- (app/api/administration/training/*) gated by proxy.ts. The public unlock
-- endpoint (app/api/training/unlock) verifies passwords server-side only.

-- ── Categories ──────────────────────────────────────────────────────────
create table if not exists training_categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text,
  icon          text,                       -- material-symbol name (optional)
  sort_order    integer not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table training_categories enable row level security;
create policy "service only" on training_categories using (false) with check (false);

create index if not exists training_categories_order_idx
  on training_categories (is_published, sort_order);

drop trigger if exists training_categories_updated_at on training_categories;
create trigger training_categories_updated_at
  before update on training_categories
  for each row execute function hr_set_updated_at();

-- ── Sub Groups ──────────────────────────────────────────────────────────
create table if not exists training_subgroups (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references training_categories (id) on delete cascade,
  name          text not null,
  slug          text not null,
  description   text,
  password_hash text,                        -- "<saltHex>:<hashHex>"; null = open
  sort_order    integer not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (category_id, slug)
);

alter table training_subgroups enable row level security;
create policy "service only" on training_subgroups using (false) with check (false);

create index if not exists training_subgroups_category_idx
  on training_subgroups (category_id, is_published, sort_order);

drop trigger if exists training_subgroups_updated_at on training_subgroups;
create trigger training_subgroups_updated_at
  before update on training_subgroups
  for each row execute function hr_set_updated_at();

-- ── Posts ───────────────────────────────────────────────────────────────
create table if not exists training_posts (
  id            uuid primary key default gen_random_uuid(),
  subgroup_id   uuid not null references training_subgroups (id) on delete cascade,
  title         text not null,
  slug          text not null,
  summary       text,
  body          text,                        -- HTML from the rich-text editor
  sort_order    integer not null default 0,
  is_published  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (subgroup_id, slug)
);

alter table training_posts enable row level security;
create policy "service only" on training_posts using (false) with check (false);

create index if not exists training_posts_subgroup_idx
  on training_posts (subgroup_id, is_published, sort_order);

drop trigger if exists training_posts_updated_at on training_posts;
create trigger training_posts_updated_at
  before update on training_posts
  for each row execute function hr_set_updated_at();

-- ── Seed example categories (editable in the admin) ─────────────────────
insert into training_categories (name, slug, icon, sort_order) values
  ('Production',  'production',  'graphic_eq',   0),
  ('Stewarding',  'stewarding',  'verified_user', 1),
  ('Hospitality', 'hospitality', 'coffee',        2),
  ('Kids',        'kids',        'child_care',    3)
on conflict (slug) do nothing;
