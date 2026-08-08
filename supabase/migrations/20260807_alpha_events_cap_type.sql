-- Allow 'cap' as an alpha_events type so the CAP Money Course can reuse the
-- shared course-events infrastructure (same table + /api/admin/alpha-events),
-- and get its own admin screen at /admin/cap-money.
--
-- Keep in sync with COURSE_EVENT_TYPES in lib/courseEvents.ts.
alter table alpha_events drop constraint if exists alpha_events_type_check;
alter table alpha_events add constraint alpha_events_type_check
  check (type in ('alpha', 'youth_alpha', 'recovery', 'bible_course', 'cap'));
