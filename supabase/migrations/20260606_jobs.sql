-- Recruitment module (Administration → HR → Jobs)
-- Public job & internship listings (/jobs) plus on-site applications.
--
-- Access model mirrors `hr_*`: RLS enabled with a single service-only policy.
-- The public /jobs pages read published roles via the service-role client in
-- server components; admin CRUD goes through service-role API routes
-- (app/api/administration/hr/jobs|applications/*) gated by proxy.ts.
-- Public application submissions use a server action (app/jobs/actions.ts),
-- which also uses the service role — so no public DB exposure is needed.

-- ── Job & internship listings ───────────────────────────────────────────
create table if not exists jobs (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  slug            text not null unique,
  kind            text not null default 'job'
                    check (kind in ('job','internship')),
  department      text,
  employment_type text not null default 'full_time'
                    check (employment_type in ('full_time','part_time','volunteer','contractor','fixed_term')),
  location        text,
  hours           text,
  salary          text,
  summary         text,
  description     text,                      -- markdown
  closing_date    date,
  is_published    boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table jobs enable row level security;
create policy "service only" on jobs using (false) with check (false);

create index if not exists jobs_published_idx on jobs (is_published, sort_order);

drop trigger if exists jobs_updated_at on jobs;
create trigger jobs_updated_at
  before update on jobs
  for each row execute function hr_set_updated_at();

-- ── Applications ────────────────────────────────────────────────────────
create table if not exists job_applications (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid references jobs (id) on delete set null,
  job_title     text not null,              -- snapshot, survives job deletion
  first_name    text not null,
  last_name     text not null,
  email         text not null,
  phone         text,
  cover_letter  text,
  cv_path       text,                       -- storage path in job-applications bucket
  cv_name       text,
  status        text not null default 'new'
                  check (status in ('new','reviewing','shortlisted','rejected','hired')),
  created_at    timestamptz not null default now()
);

alter table job_applications enable row level security;
create policy "service only" on job_applications using (false) with check (false);

create index if not exists job_applications_job_idx on job_applications (job_id);
create index if not exists job_applications_created_idx on job_applications (created_at desc);

-- ── Private storage bucket for CVs ──────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-applications',
  'job-applications',
  false,            -- private: access only via server-minted signed URLs
  10485760,         -- 10MB per file
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do nothing;
