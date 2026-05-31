-- Administration → HR module
-- Staff directory, leave & time-off, documents, and reviews/1-to-1s.
--
-- Access model mirrors `hire_enquiries`: RLS enabled with a single
-- service-only policy. All reads/writes go through service-role API routes
-- (app/api/administration/hr/*), which are gated by proxy.ts requiring a
-- Supabase auth session. HR data is sensitive, so the documents bucket is
-- PRIVATE (signed URLs only).

-- ── Shared trigger to keep updated_at fresh ─────────────────────────────
create or replace function hr_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── Staff directory ─────────────────────────────────────────────────────
create table if not exists hr_staff (
  id                        uuid primary key default gen_random_uuid(),
  first_name                text not null,
  last_name                 text not null,
  email                     text,
  phone                     text,
  job_title                 text,
  department                text,
  employment_type           text not null default 'full_time'
                              check (employment_type in ('full_time','part_time','volunteer','contractor')),
  status                    text not null default 'active'
                              check (status in ('active','on_leave','left')),
  start_date                date,
  end_date                  date,
  annual_leave_entitlement  numeric not null default 0,
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table hr_staff enable row level security;
create policy "service only" on hr_staff using (false) with check (false);

drop trigger if exists hr_staff_updated_at on hr_staff;
create trigger hr_staff_updated_at
  before update on hr_staff
  for each row execute function hr_set_updated_at();

-- ── Leave & time-off ────────────────────────────────────────────────────
create table if not exists hr_leave_requests (
  id           uuid primary key default gen_random_uuid(),
  staff_id     uuid not null references hr_staff (id) on delete cascade,
  type         text not null default 'holiday'
                 check (type in ('holiday','sick','other')),
  start_date   date not null,
  end_date     date not null,
  days         numeric not null default 0,
  reason       text,
  status       text not null default 'pending'
                 check (status in ('pending','approved','rejected')),
  reviewed_by  text,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);

alter table hr_leave_requests enable row level security;
create policy "service only" on hr_leave_requests using (false) with check (false);

create index if not exists hr_leave_requests_staff_idx on hr_leave_requests (staff_id);
create index if not exists hr_leave_requests_status_idx on hr_leave_requests (status);

-- ── Documents (metadata; files live in the private hr-documents bucket) ──
create table if not exists hr_documents (
  id           uuid primary key default gen_random_uuid(),
  staff_id     uuid references hr_staff (id) on delete cascade,  -- null = org-wide policy
  title        text not null,
  category     text not null default 'other'
                 check (category in ('contract','policy','payslip','other')),
  file_path    text not null,
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  uploaded_by  text,
  created_at   timestamptz not null default now()
);

alter table hr_documents enable row level security;
create policy "service only" on hr_documents using (false) with check (false);

create index if not exists hr_documents_staff_idx on hr_documents (staff_id);

-- ── Reviews / 1-to-1s ───────────────────────────────────────────────────
create table if not exists hr_reviews (
  id               uuid primary key default gen_random_uuid(),
  staff_id         uuid not null references hr_staff (id) on delete cascade,
  review_date      date not null,
  type             text not null default 'one_to_one'
                     check (type in ('appraisal','one_to_one')),
  reviewer         text,
  summary          text,
  next_review_date date,
  created_at       timestamptz not null default now()
);

alter table hr_reviews enable row level security;
create policy "service only" on hr_reviews using (false) with check (false);

create index if not exists hr_reviews_staff_idx on hr_reviews (staff_id);

-- ── Private storage bucket for HR documents ─────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hr-documents',
  'hr-documents',
  false,            -- private: access only via server-minted signed URLs
  20971520,         -- 20MB per file
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do nothing;
-- No storage.objects policies: the bucket is reached only through the
-- service role, which bypasses RLS.
