-- Singleton setting: which course is "featured" (full-width block) on /whats-on.
-- The other three courses render in the grid below, so all four always show.
create table if not exists featured_course (
  id integer primary key default 1,
  course_id text not null default 'bible_course'
    check (course_id in ('bible_course', 'cap', 'alpha', 'recovery')),
  updated_at timestamptz default now(),
  constraint featured_course_singleton check (id = 1)
);

insert into featured_course (id, course_id)
  values (1, 'bible_course')
  on conflict (id) do nothing;

-- Secure-by-default: RLS on + deny-all. Server routes use the service key
-- (bypasses RLS); anon / authenticated get nothing.
alter table featured_course enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'featured_course'
      and policyname = 'service only'
  ) then
    create policy "service only" on featured_course
      using (false) with check (false);
  end if;
end $$;
