-- Requester-confirmed deletion. A deliverable a requester has downloaded and
-- confirmed they have doesn't need to sit in storage forever — but a 48 hour
-- floor gives them room to notice a corrupt download or grab it again on
-- another device before the file is gone for good.
--
-- confirmed_at is set once, by the requester's own confirm action (never by
-- an admin — this is their sign-off, not ours). The purge cron
-- (/api/cron/design-deliverables-purge) sweeps rows where
-- now() - confirmed_at >= 48 hours. It runs daily like every other cron in
-- this project, so the real-world floor is 48-72h, not exactly 48 — that's
-- the deliberate trade against adding an hourly cron for one feature.
--
-- Link deliverables (storage_kind = 'link') are excluded by the app layer,
-- not a constraint here: they own no bytes of ours, so "confirmed" has
-- nothing to schedule.

alter table design_ticket_deliverables
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by_email text;

create index if not exists design_ticket_deliverables_confirmed_idx
  on design_ticket_deliverables (confirmed_at)
  where confirmed_at is not null;
