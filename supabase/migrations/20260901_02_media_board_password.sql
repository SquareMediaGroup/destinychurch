-- Optional per-board password gate for /media, independent of is_public.
-- A board can be listed on /media (or reachable via its unlisted share link)
-- and still require a password before its actual photos are shown — the same
-- "gate the content, not the listing" split training_subgroups already uses.

alter table media_boards
  add column if not exists password_hash text;

comment on column media_boards.password_hash is
  'scrypt "salt:hash", NULL = no password required. See lib/mediaAccess.ts. Never selected back to a client as-is.';
