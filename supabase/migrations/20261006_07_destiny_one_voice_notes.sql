-- Destiny One part 17: voice notes (D1 v0.8).
--
-- A voice note is an attachment like a photo or PDF: an AAC recording in an
-- .m4a file (audio/mp4), uploaded to the private d1-chat-media bucket and
-- kept, deleted and purged exactly like every other attachment, so the
-- safeguarding transcript can play it. Up to 5 minutes; the length is kept
-- so the app can show it before the file has downloaded.

alter table public.d1_attachments drop constraint if exists d1_attachments_mime_type_check;
alter table public.d1_attachments add constraint d1_attachments_mime_type_check
  check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf', 'audio/mp4'));

alter table public.d1_attachments add column if not exists duration_ms integer
  constraint d1_attachments_duration check (duration_ms is null or duration_ms between 1 and 300000);

update storage.buckets
  set allowed_mime_types = array_append(allowed_mime_types, 'audio/mp4')
  where id = 'd1-chat-media'
    and allowed_mime_types is not null
    and not ('audio/mp4' = any (allowed_mime_types));
