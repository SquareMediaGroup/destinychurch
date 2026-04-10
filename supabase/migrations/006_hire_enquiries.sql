create table if not exists hire_enquiries (
  id            bigint generated always as identity primary key,
  name          text not null,
  email         text not null,
  phone         text not null,
  organisation  text,
  event_type    text not null,
  space         text not null,
  date          text not null,
  start_time    text not null,
  end_time      text not null,
  attendance    text not null,
  requirements  text,
  message       text,
  created_at    timestamptz not null default now()
);

alter table hire_enquiries enable row level security;

-- Only service-role (server) can read/write
create policy "service only" on hire_enquiries
  using (false)
  with check (false);
