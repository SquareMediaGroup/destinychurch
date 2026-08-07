-- Access levels for /admin: five independent per-user booleans, checked by
-- middleware.ts against lib/adminRoles.ts's ROUTE_RULES. Distinct from the
-- legacy unused `admin_users` table in schema.sql (username/password_hash —
-- predates the Supabase Auth migration and isn't read by any app code).
--
-- RLS follows the standard deny-all pattern: the app reads/writes this table
-- exclusively via the service/secret key (createServiceClient()).

create table if not exists admin_roles (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  training_admin boolean not null default false,
  event_admin boolean not null default false,
  store_admin boolean not null default false,
  site_admin boolean not null default false,
  super_admin boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table admin_roles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admin_roles' and policyname = 'service only'
  ) then
    create policy "service only" on admin_roles using (false) with check (false);
  end if;
end $$;

-- Backfill: every auth user that exists today effectively has full access
-- under the old single-role model, so grant them super_admin rather than
-- locking anyone out when this ships.
insert into admin_roles (auth_user_id, email, super_admin)
select id, email, true from auth.users
on conflict (auth_user_id) do nothing;
