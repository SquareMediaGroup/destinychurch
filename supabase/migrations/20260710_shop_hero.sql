-- Shop hero slides — dynamic, admin-editable, auto-rotating hero for /shop.
--
-- Mirrors the shop module's access model (see 20260708_shop.sql): RLS enabled
-- with a single service-only policy. The public /shop page reads active slides
-- via the service-role client in a server component (lib/shop.server.ts); admin
-- CRUD goes through service-role API routes (app/api/admin/shop-hero/*) gated by
-- middleware.ts. Unlike the single-row site_popup, this is one row per slide,
-- ordered by sort_order, so the hero can rotate through several slides.

-- Reuse the shop updated_at trigger fn (defined in 20260708_shop.sql; redefined
-- here so this migration is self-contained and idempotent).
create or replace function shop_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists shop_hero_slides (
  id          uuid primary key default gen_random_uuid(),
  active      boolean not null default true,
  heading     text,
  subheading  text,
  cta_text    text,
  cta_link    text,
  image_url   text,
  image_path  text,                              -- storage path in shop-hero-images
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table shop_hero_slides enable row level security;
drop policy if exists "service only" on shop_hero_slides;
create policy "service only" on shop_hero_slides using (false) with check (false);

create index if not exists shop_hero_slides_active_idx
  on shop_hero_slides (active, sort_order);

drop trigger if exists shop_hero_slides_updated_at on shop_hero_slides;
create trigger shop_hero_slides_updated_at
  before update on shop_hero_slides
  for each row execute function shop_set_updated_at();

-- ── Public storage bucket for hero background images ─────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-hero-images',
  'shop-hero-images',
  true,             -- public read: hero images are shown on the storefront
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

drop policy if exists "Public can read shop-hero-images" on storage.objects;
create policy "Public can read shop-hero-images"
on storage.objects for select
using (bucket_id = 'shop-hero-images');

drop policy if exists "Authenticated users can upload shop-hero-images" on storage.objects;
create policy "Authenticated users can upload shop-hero-images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'shop-hero-images');

drop policy if exists "Authenticated users can update shop-hero-images" on storage.objects;
create policy "Authenticated users can update shop-hero-images"
on storage.objects for update
to authenticated
using (bucket_id = 'shop-hero-images');

drop policy if exists "Authenticated users can delete shop-hero-images" on storage.objects;
create policy "Authenticated users can delete shop-hero-images"
on storage.objects for delete
to authenticated
using (bucket_id = 'shop-hero-images');
