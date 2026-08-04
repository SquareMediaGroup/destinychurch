-- NFC tiles: the admin-managed rows on the /nfc "digital back of seats" page.
--
-- The page always renders a Connect Card tile and a Giving tile. Those two are
-- hardcoded in lib/nfcTiles.ts rather than seeded here, deliberately: they must
-- survive an empty table, a bad deploy, or a Supabase outage mid-service, and a
-- row an admin can delete is a row that will eventually get deleted.
--
-- Everything else — Alpha, a term's course promo, a one-off ChurchSuite form —
-- lives here so it can go up before a service without a deploy.
--
-- Two shapes of tile, per `mode`:
--   embed — opens a ChurchSuite form/event in an iframe inside the popup.
--   info  — shows artwork + copy + a CTA button through to a page on the site.
--
-- Length checks follow the featured_event precedent: copy that would overflow
-- the tile face or the popup is rejected at write time rather than silently
-- clipped at render time.

create table if not exists public.nfc_tiles (
  id uuid primary key default gen_random_uuid(),
  active boolean not null default true,
  sort_order integer not null default 0,
  title text not null,
  subtitle text,
  icon text not null default 'star',
  mode text not null default 'info' check (mode in ('embed', 'info')),
  embed_url text,
  embed_size text not null default 'md' check (embed_size in ('md', 'lg')),
  body text,
  image_url text,
  image_path text,
  cta_text text,
  cta_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nfc_tiles_embed_requires_url
    check (mode <> 'embed' or embed_url is not null),
  constraint nfc_tiles_title_len
    check (char_length(title) between 1 and 60),
  constraint nfc_tiles_subtitle_len
    check (char_length(coalesce(subtitle, '')) <= 90),
  constraint nfc_tiles_body_len
    check (char_length(coalesce(body, '')) <= 600)
);

create index if not exists nfc_tiles_active_order_idx
  on public.nfc_tiles (active, sort_order);

alter table public.nfc_tiles enable row level security;

-- Reads go through createServiceClient() on the server, but the active-row
-- policy matches site_popup so the table isn't accidentally deny-all-everything
-- if a client-side read is ever added.
drop policy if exists "nfc_tiles_public_read_active" on public.nfc_tiles;
create policy "nfc_tiles_public_read_active"
  on public.nfc_tiles for select
  using (active = true);

-- Tile artwork reuses the existing public `popup-images` bucket (created by
-- 20260502_create_site_popup.sql) under an `nfc-` filename prefix. No new
-- bucket or storage policy is needed.
