-- Destiny One part 8: account roles become Admin, CG Leader and Senior Leader.
--
-- The old roles differed in power (only senior_leadership could create
-- communities). The new ones do not: all three are simply "leader", and differ
-- only in the tag shown beside the person's name in chats and on their profile.
--
--   group_leader      -> cg_leader
--   senior_leadership -> senior_leader
--   (new)             -> admin
--
-- d1_is_senior() is kept, because community creation and group management call
-- it, but it now means "holds any of the three roles", the same as
-- d1_is_leader(). Everything else that keys off those two functions follows.

-- ── Constraints ─────────────────────────────────────────────────────────────
-- Drop whichever check constraints name the old roles (auto-named, so found by
-- definition), migrate the data, then add the new ones.

do $$
declare
  c record;
begin
  for c in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where contype = 'c'
      and conrelid in ('public.d1_members'::regclass, 'public.d1_invites'::regclass)
      and pg_get_constraintdef(oid) like '%senior_leadership%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

update public.d1_members
  set roles = array(
    select distinct case r when 'group_leader' then 'cg_leader'
                           when 'senior_leadership' then 'senior_leader'
                           else r end
    from unnest(roles) as r)
  where roles && array['group_leader', 'senior_leadership']::text[];

update public.d1_invites
  set roles = array(
    select distinct case r when 'group_leader' then 'cg_leader'
                           when 'senior_leadership' then 'senior_leader'
                           else r end
    from unnest(roles) as r)
  where roles && array['group_leader', 'senior_leadership']::text[];

-- The updates above queue deferred constraint triggers; run them now, or the
-- ALTER TABLEs below fail with "pending trigger events" on a database with data.
set constraints all immediate;

alter table public.d1_members add constraint d1_members_roles_check
  check (roles <@ array['admin', 'cg_leader', 'senior_leader']::text[]);
alter table public.d1_invites add constraint d1_invites_roles_check
  check (roles <@ array['admin', 'cg_leader', 'senior_leader']::text[]);

-- ── Who counts as a leader ──────────────────────────────────────────────────

create or replace function public.d1_is_leader(p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.d1_members
    where id = p_member and status = 'active'
      and roles && array['admin', 'cg_leader', 'senior_leader']::text[]
  );
$$;

create or replace function public.d1_is_senior(p_member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.d1_is_leader(p_member);
$$;
