-- Remove the Media Boards feature (photo boards, upload moderation queue,
-- and the Playbook DAM integration that backed it). The feature and its
-- admin UI/API/pages have been deleted from the codebase; this drops the
-- remaining database objects.
--
-- On the live project (applied 2026-09-29) the bucket still held 22 files,
-- which SQL can't delete, so the bucket line was left out there: empty and
-- remove the media-photos bucket from the Supabase dashboard.

drop policy if exists "Public can read media-photos" on storage.objects;
delete from storage.buckets where id = 'media-photos';

-- The two tables reference each other (board cover photo / photo's board),
-- so they are dropped in one statement.
drop table if exists media_photos, media_boards;

alter table admin_roles drop column if exists media_admin;
