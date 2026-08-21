-- Tracks whether a review's upcoming-date reminder has already gone out, so
-- the daily digest (app/api/cron/hr-review-reminders/route.ts) doesn't
-- re-notify the same review every day it stays inside the reminder window.

alter table hr_reviews
  add column if not exists reminder_sent_at timestamptz;

create index if not exists hr_reviews_reminder_idx
  on hr_reviews (next_review_date)
  where reminder_sent_at is null;
