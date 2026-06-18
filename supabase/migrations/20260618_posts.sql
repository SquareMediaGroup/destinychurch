-- Posts module (Administration → Posts)
-- Standalone, admin-authored pages served at a top-level slug (e.g. /easter-2026).
-- NOT a blog: no categories, no feed/index, no bylines — just title + body + slug.
--
-- Access model mirrors `jobs` / `hr_*`: RLS enabled with a single service-only
-- policy. All reads/writes go through the service-role client in server code.

create table if not exists posts (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text not null unique,        -- global, admin-chosen, validated
  body         text,                        -- HTML from the rich-text editor
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table posts enable row level security;
create policy "service only" on posts using (false) with check (false);

create index if not exists posts_slug_published_idx on posts (slug, is_published);

-- ── Storage bucket for post images ───────────────────────────────────────────
-- Public read (images appear on published public pages), low-cost/free via the
-- existing Supabase project. Uploads are converted to WebP before storage.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  5242880, -- 5MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do nothing;

create policy "Public can read post-media"
on storage.objects for select
using (bucket_id = 'post-media');

create policy "Authenticated users can upload post-media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'post-media');

create policy "Authenticated users can update post-media"
on storage.objects for update
to authenticated
using (bucket_id = 'post-media');

create policy "Authenticated users can delete post-media"
on storage.objects for delete
to authenticated
using (bucket_id = 'post-media');
