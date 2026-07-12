-- Allow 'bible_course' as an alpha_events type so The Bible Course can reuse
-- the shared course-events infrastructure (same table + /api/admin/alpha-events).
alter table alpha_events drop constraint if exists alpha_events_type_check;
alter table alpha_events add constraint alpha_events_type_check
  check (type in ('alpha', 'youth_alpha', 'recovery', 'bible_course'));
