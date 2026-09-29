-- Destiny One: members may change their own name twice in any 30 days.
-- name_change_log holds the times they did; the API counts the last 30 days.
-- (name_edited_at stays: it only tells the ChurchSuite re-sync to leave the name alone.)

alter table public.d1_members add column if not exists name_change_log timestamptz[] not null default '{}';

comment on column public.d1_members.name_change_log is
  'When the member changed their own name; at most 2 within any 30 days (enforced by PATCH /me).';
