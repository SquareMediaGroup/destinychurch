-- A third kind of /nfc tile: `event`.
--
-- The seat-back page's whole point is that the moment to sign up for something
-- is during the notices, not later at home. Before this, the only way to put an
-- event on /nfc was an `embed` tile with a hand-pasted ChurchSuite event URL —
-- which carries no date on the tile face and goes silently stale the morning
-- after the event runs.
--
-- An event tile stores a *pointer* into the ChurchSuite feed plus snapshots of
-- what it resolved to, exactly as `featured_event` does (20260728_featured_event.sql),
-- and for the same two reasons: the admin list needs something to display without
-- hitting the feed, and the tile has to survive a ChurchSuite outage mid-service.
--
-- The signup URL deliberately reuses `embed_url` rather than getting a column of
-- its own. An event tile *is* an embed tile once resolved — the popup frames the
-- ChurchSuite signup form the same way the Connect Card tile frames its form —
-- so sharing the column means the renderer needs one widened condition instead
-- of a whole second code path, and a resolved row stays renderable when the feed
-- is unreachable.
--
-- Auto-expiry is driven by `event_ends_at`: the tile stops rendering on /nfc once
-- the last occurrence has finished, but the row stays put so the admin list can
-- say why and offer a repoint rather than leaving a mystery gap.

-- The original check was declared inline on the column, so its name is whatever
-- Postgres generated. Find it by definition rather than betting on the name: a
-- missed drop would leave the old two-value check in force and reject every
-- event tile at write time, which is a failure that only shows up in the foyer.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'nfc_tiles'
      and con.contype = 'c'
      -- The enum check is the only one listing the mode values; matching on
      -- 'info' leaves nfc_tiles_embed_requires_url (which also mentions `mode`)
      -- and the event target check below alone.
      and pg_get_constraintdef(con.oid) like '%mode%'
      and pg_get_constraintdef(con.oid) like '%''info''%'
  loop
    execute format(
      'alter table public.nfc_tiles drop constraint %I',
      constraint_name
    );
  end loop;
end $$;

alter table public.nfc_tiles
  add constraint nfc_tiles_mode_check
    check (mode in ('embed', 'info', 'event'));

alter table public.nfc_tiles
  add column if not exists event_identifier text,
  add column if not exists event_sequence integer,
  add column if not exists event_slug text,
  add column if not exists event_name text,
  add column if not exists event_ends_at timestamptz;

-- Both halves matter: the identifier is how the row is re-resolved against the
-- feed, and embed_url is the snapshot that keeps the popup working when it can't be.
alter table public.nfc_tiles
  drop constraint if exists nfc_tiles_event_requires_target;

alter table public.nfc_tiles
  add constraint nfc_tiles_event_requires_target
    check (
      mode <> 'event'
      or (event_identifier is not null and embed_url is not null)
    );

comment on column public.nfc_tiles.event_identifier is
  'ChurchSuite occurrence identifier of the series primary — the feed lookup key.';
comment on column public.nfc_tiles.event_sequence is
  'ChurchSuite series key; null for one-offs. Fallback lookup when the identifier moves.';
comment on column public.nfc_tiles.event_ends_at is
  'End of the last occurrence. Drives auto-expiry without needing the feed.';
