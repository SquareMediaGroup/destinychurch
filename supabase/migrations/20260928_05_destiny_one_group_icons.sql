-- Group chat icons. Any current member can set or remove their group's icon.
-- icon_path is a storage path in the private d1-avatars bucket (same bucket
-- and signed-link handling as profile pictures); the API hands the app a
-- short-lived signed URL. Writes go through /api/app/v1/one/groups/[id]/icon.

alter table public.d1_groups add column if not exists icon_path text;
