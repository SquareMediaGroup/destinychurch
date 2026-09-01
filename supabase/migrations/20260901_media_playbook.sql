-- Switches /media's photo storage from the `media-photos` Supabase bucket to
-- Playbook (dev.playbook.com) — see lib/playbook.server.ts. Every other
-- Supabase Storage bucket (popup-images, post-media, hr-documents,
-- shop-hero-images, product-images) is untouched.
--
-- `file_path` is made nullable rather than dropped: it's simply unused for
-- every photo going forward, and dropping a column that some other
-- in-flight branch might still reference is a needless risk for no benefit.

alter table media_photos alter column file_path drop not null;

alter table media_boards
  add column if not exists playbook_board_token text;

alter table media_photos
  add column if not exists playbook_asset_token text,
  add column if not exists playbook_permalink_url text;

comment on column media_boards.playbook_board_token is
  'The matching Playbook board this board''s photos are uploaded into. Created lazily via lib/playbook.server.ts:getOrCreateBoard().';
comment on column media_photos.playbook_asset_token is
  'The Playbook asset token. Needed for delete and for creating a permalink on approval.';
comment on column media_photos.playbook_permalink_url is
  'Permanent, unsigned Playbook CDN URL — set on approval only (createPermalink() spends one of the org''s plan-capped permalinks, so a pending/rejected photo never needed one). NULL until then; the admin queue instead fetches a short-lived signed display_url on demand.';
