-- Profile pictures for the staff portal account settings (/portal). Applied
-- directly to the project via the Supabase MCP tool; checked in here so the
-- schema history stays reproducible.

alter table hr_staff add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'staff-avatars',
  'staff-avatars',
  true,             -- public read: shown in the portal header and admin HR screens
  5242880,          -- 5MB per file
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]::text[]
)
on conflict (id) do nothing;

-- Public read only. Every write goes through /api/portal/me/avatar using the
-- service-role client (bypasses RLS), so no authenticated-write policy is
-- added here — an authenticated policy would let any signed-in user overwrite
-- another staff member's avatar file directly via the client SDK.
create policy "Public read access for staff-avatars"
on storage.objects for select
using (bucket_id = 'staff-avatars');
