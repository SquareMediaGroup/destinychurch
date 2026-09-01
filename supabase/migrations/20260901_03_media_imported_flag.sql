-- Marks a photo as brought in via "Import from Playbook" rather than uploaded
-- through /media itself. This distinction matters for deletion safety: an
-- imported photo's Playbook asset already existed before /media referenced
-- it (it's the church's own pre-existing content, e.g. the real
-- "Sunday Services" board with hundreds of photos) — deleting a /media
-- board or photo must never cascade into deleting that asset from Playbook,
-- only ever our own reference to it. An uploaded photo, by contrast, was
-- created by our own upload route and is safe to delete from Playbook too
-- when removed from /media.

alter table media_photos
  add column if not exists is_imported boolean not null default false;

comment on column media_photos.is_imported is
  'true = brought in via "Import from Playbook" (app/api/admin/media/import). The underlying Playbook asset pre-dates /media and must never be deleted from Playbook when this row is removed — only false (an /media upload) is safe to hard-delete on Playbook.';
