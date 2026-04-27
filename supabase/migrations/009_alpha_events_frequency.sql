-- Add cadence info to alpha_events so /alpha can compute the *next* session
-- after the start date has passed (e.g. "weekly" courses keep advancing).
alter table alpha_events
  add column if not exists frequency text not null default 'weekly'
    check (frequency in ('weekly', 'fortnightly', 'monthly', 'custom', 'one_off')),
  add column if not exists custom_interval_days integer;
