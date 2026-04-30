alter table alpha_events drop constraint if exists alpha_events_type_check;
alter table alpha_events add constraint alpha_events_type_check
  check (type in ('alpha', 'youth_alpha', 'recovery'));
