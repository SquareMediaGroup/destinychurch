-- Per-admin onboarding progress.
--
-- /admin is taught role by role: a Store Admin is walked through the store, a
-- Site Admin through posts and redirects, and someone holding three roles gets
-- all three tours back to back. This table is the only thing that remembers
-- where a person got to, so the welcome gate fires exactly once and the
-- checklist keeps its ticks across devices.
--
-- One row per admin, created lazily on first read (the API upserts). Super
-- admins never get onboarding — they preview other roles from
-- /admin/onboarding instead — so they simply never grow a row.
--
-- completed_steps holds TourSection ids from lib/adminOnboarding.ts, not step
-- ids: the checklist is the unit of progress a person recognises ("Add a
-- product"), and step ids churn whenever we reword a tour. Unknown ids are
-- ignored on read, so deleting a section from the registry is safe.
--
-- RLS mirrors admin_roles: deny-all, service-key only. The route reads the
-- caller from their own cookie session and can only ever touch their own row —
-- there is no path here for one admin to read another's progress.

create table if not exists public.admin_onboarding (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  completed_steps text[] not null default '{}',
  -- The welcome modal has been answered (started or explicitly skipped).
  gate_seen boolean not null default false,
  -- The checklist has been dismissed; it stays hidden until reset.
  dismissed boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_onboarding enable row level security;

drop policy if exists "service only" on public.admin_onboarding;
create policy "service only" on public.admin_onboarding using (false) with check (false);

comment on table public.admin_onboarding is
  'Onboarding progress for /admin, one row per admin. Written only by app/api/admin/onboarding via the service key.';
comment on column public.admin_onboarding.completed_steps is
  'TourSection ids from lib/adminOnboarding.ts that this admin has finished.';
