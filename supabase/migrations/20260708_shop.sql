-- Shop module (Store → /shop, admin at /admin/store)
-- Stripe-powered store replacing the old WooCommerce site. Physical apparel with
-- size + colour variants (per-variant stock), collection-only fulfilment.
--
-- Access model mirrors `jobs`: RLS enabled with a single service-only policy.
-- Public /shop pages read published products via the service-role client in
-- server components (lib/shop.server.ts); admin CRUD goes through service-role
-- API routes (app/api/admin/store/*) gated by middleware.ts. Public checkout
-- (app/api/store/checkout) and the Stripe webhook (app/api/webhooks/stripe) also
-- use the service role — so no public DB exposure is needed.
--
-- Prices are stored as integer pennies (GBP). Never trust client prices — the
-- checkout route recomputes every amount from these rows server-side.

-- Shared updated_at trigger for shop tables.
create or replace function shop_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── Products ────────────────────────────────────────────────────────────
create table if not exists products (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name               text not null,
  description        text,                                   -- plain / light HTML
  base_price_pennies integer not null default 0,
  category           text,
  images             jsonb not null default '[]'::jsonb,     -- [{ url, path, alt }]
  is_published       boolean not null default false,
  is_featured        boolean not null default false,
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table products enable row level security;
create policy "service only" on products using (false) with check (false);

create index if not exists products_published_idx on products (is_published, sort_order);

drop trigger if exists products_updated_at on products;
create trigger products_updated_at
  before update on products
  for each row execute function shop_set_updated_at();

-- ── Product variants (size × colour) ────────────────────────────────────
create table if not exists product_variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products (id) on delete cascade,
  size          text not null default '',
  color         text not null default '',
  color_hex     text,
  sku           text,
  price_pennies integer,                    -- null → inherit product base price
  stock         integer not null default 0,
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (product_id, size, color)
);

alter table product_variants enable row level security;
create policy "service only" on product_variants using (false) with check (false);

create index if not exists product_variants_product_idx on product_variants (product_id);

drop trigger if exists product_variants_updated_at on product_variants;
create trigger product_variants_updated_at
  before update on product_variants
  for each row execute function shop_set_updated_at();

-- ── Orders ──────────────────────────────────────────────────────────────
create table if not exists orders (
  id                       uuid primary key default gen_random_uuid(),
  order_number             text not null unique,             -- human-friendly (nanoid)
  stripe_payment_intent_id text unique,
  customer_name            text not null,
  customer_email           text not null,
  customer_phone           text,
  notes                    text,
  status                   text not null default 'pending'
                             check (status in ('pending','paid','fulfilled','cancelled','refunded')),
  fulfillment_method       text not null default 'collection',
  subtotal_pennies         integer not null default 0,
  total_pennies            integer not null default 0,
  currency                 text not null default 'gbp',
  paid_at                  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

alter table orders enable row level security;
create policy "service only" on orders using (false) with check (false);

create index if not exists orders_status_idx on orders (status, created_at desc);
create index if not exists orders_created_idx on orders (created_at desc);

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at
  before update on orders
  for each row execute function shop_set_updated_at();

-- ── Order items (snapshot of what was bought) ───────────────────────────
create table if not exists order_items (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references orders (id) on delete cascade,
  product_id         uuid references products (id) on delete set null,
  variant_id         uuid references product_variants (id) on delete set null,
  product_name       text not null,          -- snapshot, survives product deletion
  size               text,
  color              text,
  unit_price_pennies integer not null,
  quantity           integer not null default 1,
  created_at         timestamptz not null default now()
);

alter table order_items enable row level security;
create policy "service only" on order_items using (false) with check (false);

create index if not exists order_items_order_idx on order_items (order_id);

-- ── Public storage bucket for product images ────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,             -- public read: product photos are shown on the storefront
  10485760,         -- 10MB per file
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ]::text[]
)
on conflict (id) do nothing;

create policy "Public can read product-images"
on storage.objects for select
using (bucket_id = 'product-images');

create policy "Authenticated users can upload product-images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images');

create policy "Authenticated users can update product-images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images');

create policy "Authenticated users can delete product-images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images');
