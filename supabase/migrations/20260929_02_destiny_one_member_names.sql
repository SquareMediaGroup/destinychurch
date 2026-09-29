-- Destiny One: members can change their own name; first and last name are
-- stored separately.
--
-- display_name stays (chat, search, safeguarding and admin screens all read it)
-- but is now derived: a trigger keeps it equal to "first last" whenever the
-- first/last columns change, and splits it into first/last whenever something
-- older (ChurchSuite sync, invites, GDPR erasure, staff edits) writes only
-- display_name. Nothing that writes display_name needs to change.
--
-- name_edited_at is set when the member changes their own name. The ChurchSuite
-- re-sync leaves the name alone once it is set, so a self-edit is not undone
-- overnight. The changed name is still visible to safeguarding and staff.

alter table public.d1_members add column if not exists first_name text not null default '';
alter table public.d1_members add column if not exists last_name text not null default '';
alter table public.d1_members add column if not exists name_edited_at timestamptz;

-- Split on the first space: "Mary Jane Watson" -> "Mary" / "Jane Watson".
update public.d1_members
   set first_name = split_part(btrim(display_name), ' ', 1),
       last_name = btrim(substr(btrim(display_name), char_length(split_part(btrim(display_name), ' ', 1)) + 1))
 where first_name = '' and last_name = '';

create or replace function public.d1_members_sync_names()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  trimmed text;
  first_part text;
  from_parts boolean;
begin
  new.first_name := btrim(coalesce(new.first_name, ''));
  new.last_name := btrim(coalesce(new.last_name, ''));

  if tg_op = 'INSERT' then
    from_parts := new.first_name <> '' or new.last_name <> '';
  else
    from_parts := new.first_name is distinct from old.first_name
               or new.last_name is distinct from old.last_name;
  end if;

  if from_parts then
    new.display_name := btrim(new.first_name || ' ' || new.last_name);
  else
    trimmed := btrim(new.display_name);
    first_part := split_part(trimmed, ' ', 1);
    new.first_name := first_part;
    new.last_name := btrim(substr(trimmed, char_length(first_part) + 1));
  end if;
  return new;
end;
$$;

drop trigger if exists d1_members_sync_names on public.d1_members;
create trigger d1_members_sync_names
  before insert or update on public.d1_members
  for each row execute function public.d1_members_sync_names();

comment on column public.d1_members.first_name is
  'Given name. display_name is kept equal to "first last" by d1_members_sync_names.';
comment on column public.d1_members.name_edited_at is
  'Set when the member changed their own name; the ChurchSuite re-sync then leaves the name alone.';
