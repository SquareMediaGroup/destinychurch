-- Profile pictures + editable name, extended beyond the staff portal to
-- admin accounts and Destiny One members.
--
-- Applied directly to the project via the Supabase MCP tool; checked in here
-- so the schema history stays reproducible.
--
-- Destiny One members keep display_name locked to ChurchSuite (see
-- 20260926_01_destiny_one.sql: "no pseudonyms in a safeguarding context") —
-- only avatar_url is added for them, not a name column.

alter table admin_roles add column if not exists name text;
alter table admin_roles add column if not exists avatar_url text;

alter table d1_members add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admin-avatars',
  'admin-avatars',
  true,             -- public read: shown in the admin header
  5242880,          -- 5MB per file
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]::text[]
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'd1-avatars',
  'd1-avatars',
  true,             -- public read: shown to other members in chats/directory
  5242880,          -- 5MB per file
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic'
  ]::text[]
)
on conflict (id) do nothing;

-- Public read only for both buckets. Every write goes through a service-role
-- API route (/api/admin/me/avatar, /api/app/v1/one/me/avatar), so no
-- authenticated-write policy is added here — that would let any signed-in
-- user overwrite someone else's avatar file directly via the client SDK.
create policy "Public read access for admin-avatars"
on storage.objects for select
using (bucket_id = 'admin-avatars');

create policy "Public read access for d1-avatars"
on storage.objects for select
using (bucket_id = 'd1-avatars');
