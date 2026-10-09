-- Destiny One: voice notes failed to upload with "mime type audio/x-m4a is not
-- supported". iOS labels a recorded .m4a file audio/x-m4a on the upload (the
-- file's own type, whatever the app declared), and Storage checks that label
-- against the bucket. The attachment is still recorded as audio/mp4; this only
-- lets the other names for the same AAC .m4a file through the bucket.

update storage.buckets
  set allowed_mime_types = (
    select array_agg(distinct m)
    from unnest(allowed_mime_types || array['audio/x-m4a', 'audio/m4a', 'audio/aac']) as m
  )
  where id = 'd1-chat-media'
    and allowed_mime_types is not null;
