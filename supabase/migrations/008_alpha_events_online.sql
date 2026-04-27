-- Add online-meeting fields to alpha_events so events can be hosted on
-- Zoom or Google Meet. In-person events keep using the existing `location`
-- column; online events use the meeting_* columns.

alter table alpha_events
  add column if not exists format text not null default 'in_person'
    check (format in ('in_person', 'online')),
  add column if not exists meeting_platform text
    check (meeting_platform in ('zoom', 'google_meet')),
  add column if not exists meeting_url text,
  add column if not exists meeting_id text,
  add column if not exists meeting_passcode text;
