-- Site popup: single-row table + storage bucket for popup images.

create table if not exists public.site_popup (
  id uuid primary key default gen_random_uuid(),
  active boolean not null default false,
  title text,
  body text,
  cta_text text,
  cta_link text,
  image_url text,
  image_path text,
  show_once boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_popup enable row level security;

drop policy if exists "site_popup_public_read_active" on public.site_popup;
create policy "site_popup_public_read_active"
  on public.site_popup for select
  using (active = true);

-- Storage bucket for popup images (public read, 50 MB cap, image MIME types only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'popup-images',
  'popup-images',
  true,
  52428800,
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "popup_images_authenticated_all" on storage.objects;
create policy "popup_images_authenticated_all"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'popup-images')
  with check (bucket_id = 'popup-images');

drop policy if exists "popup_images_public_read" on storage.objects;
create policy "popup_images_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'popup-images');
