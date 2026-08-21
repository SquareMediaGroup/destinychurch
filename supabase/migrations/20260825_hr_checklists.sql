-- Onboarding/offboarding checklists.
--
-- Distinct from — and unrelated to — the admin-dashboard product tour
-- (admin_onboarding, lib/demoMode.ts): this is new-hire/leaver paperwork
-- (contract, DBS/safeguarding checks, induction, equipment return), not a UI
-- walkthrough. Named hr_checklist_* to keep that separation obvious.
--
-- Templates hold reusable items; "starting" a checklist on a staff member
-- copies the template's items into that staff member's own rows. Editing a
-- template afterward never retroactively changes an already-started staff
-- checklist, and HR can freely add one-off items to an individual's list.

create table if not exists hr_checklist_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  kind       text not null check (kind in ('onboarding','offboarding')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table hr_checklist_templates enable row level security;
create policy "service only" on hr_checklist_templates using (false) with check (false);

drop trigger if exists hr_checklist_templates_updated_at on hr_checklist_templates;
create trigger hr_checklist_templates_updated_at
  before update on hr_checklist_templates
  for each row execute function hr_set_updated_at();

create table if not exists hr_checklist_template_items (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references hr_checklist_templates (id) on delete cascade,
  label       text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table hr_checklist_template_items enable row level security;
create policy "service only" on hr_checklist_template_items using (false) with check (false);

create index if not exists hr_checklist_template_items_template_idx
  on hr_checklist_template_items (template_id);

create table if not exists hr_checklist_items (
  id         uuid primary key default gen_random_uuid(),
  staff_id   uuid not null references hr_staff (id) on delete cascade,
  kind       text not null check (kind in ('onboarding','offboarding')),
  label      text not null,
  is_done    boolean not null default false,
  done_at    timestamptz,
  due_date   date,
  sort_order integer not null default 0,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table hr_checklist_items enable row level security;
create policy "service only" on hr_checklist_items using (false) with check (false);

create index if not exists hr_checklist_items_staff_idx on hr_checklist_items (staff_id);
create index if not exists hr_checklist_items_staff_kind_idx on hr_checklist_items (staff_id, kind);

drop trigger if exists hr_checklist_items_updated_at on hr_checklist_items;
create trigger hr_checklist_items_updated_at
  before update on hr_checklist_items
  for each row execute function hr_set_updated_at();
