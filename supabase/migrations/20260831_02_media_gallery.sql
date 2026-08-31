-- Administration → Media (Administration → /media photo gallery)
-- Boards of photos, some public and listed on /media, some unlisted and
-- reachable only by a shared link. Visitors upload anonymously; every photo
-- sits in a moderation queue until a Media Team admin approves it.
--
-- Access model mirrors `posts`/`hr_*`: RLS enabled with a single service-only
-- policy on both tables. All reads/writes go through service-role API routes:
--   - app/api/admin/media/* (gated by middleware.ts, requires media_admin)
--   - app/api/media/* (public — no auth wall at all; this is the first
--     service-only table written to by an anonymous route. That's fine here:
--     the route itself validates and uses the service-role client, so RLS
--     staying deny-all is the same invariant every other table in this
--     codebase already follows, not a relaxed anon-key policy.)
--
-- Public/private is a property of the BOARD (is_public), enforced at the API
-- layer, not by splitting storage into two buckets. Storage stays one public
-- bucket because pending vs. approved is also enforced at the API layer
-- (only status='approved' rows are ever returned to the public), and every
-- object path is a random UUID nobody can guess without the DB row first.

create table if not exists media_boards (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  slug           text not null unique,          -- public URL segment, e.g. "sunday-service"
  description    text,
  cover_photo_id uuid,                          -- FK added below, once media_photos exists
  is_public      boolean not null default true, -- true = listed on /media; false = unlisted, link-only
  share_token    text not null unique default encode(gen_random_bytes(16), 'hex'),
                                                  -- opaque token for the unlisted-board URL, /media/s/[token]
  allow_uploads  boolean not null default true, -- media_admin can close a board to new submissions
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table media_boards enable row level security;
create policy "service only" on media_boards using (false) with check (false);

create index if not exists media_boards_public_idx on media_boards (is_public, created_at desc);

create table if not exists media_photos (
  id               uuid primary key default gen_random_uuid(),
  board_id         uuid not null references media_boards (id) on delete cascade,
  file_path        text not null,              -- path inside the media-photos bucket
  file_name        text not null,              -- original filename, display only
  mime_type        text,
  size_bytes       bigint,
  width            integer,
  height           integer,
  uploader_name    text not null,              -- plain text, no auth/FK — anonymous upload
  status           text not null default 'pending'
                     check (status in ('pending', 'approved', 'rejected')),
  reviewed_by      text,                       -- admin email, set on approve/reject
  reviewed_at      timestamptz,
  reject_reason    text,
  uploader_ip_hash text,                       -- sha256(ip + salt), abuse throttling only, never the raw IP
  created_at       timestamptz not null default now()
);

alter table media_photos enable row level security;
create policy "service only" on media_photos using (false) with check (false);

create index if not exists media_photos_board_status_idx on media_photos (board_id, status, created_at desc);
create index if not exists media_photos_status_idx on media_photos (status, created_at desc);
create index if not exists media_photos_ip_throttle_idx on media_photos (uploader_ip_hash, created_at desc);

alter table media_boards
  add constraint media_boards_cover_photo_fkey
  foreign key (cover_photo_id) references media_photos (id) on delete set null;

-- ── Public storage bucket for photos ─────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media-photos',
  'media-photos',
  true,
  10485760, -- 10MB per file
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do nothing;

create policy "Public can read media-photos"
on storage.objects for select
using (bucket_id = 'media-photos');

-- No insert/update/delete policy for anon or authenticated: every write,
-- including an admin adding an "official" photo directly, goes through a
-- server route using createServiceClient(), which bypasses RLS.
