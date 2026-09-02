-- Remove the Media Boards feature (photo boards, upload moderation queue,
-- and the Playbook DAM integration that backed it). The feature and its
-- admin UI/API/pages have been deleted from the codebase; this drops the
-- remaining database objects.

drop policy if exists "Public can read media-photos" on storage.objects;
delete from storage.buckets where id = 'media-photos';

drop table if exists media_photos;
drop table if exists media_boards;

alter table admin_roles drop column if exists media_admin;
