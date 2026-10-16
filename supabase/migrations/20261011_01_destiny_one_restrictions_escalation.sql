-- Destiny One — timed posting restrictions and report escalation.
--
-- Both come from the D1 Admin desktop app (apps/d1-admin), and both are
-- available to the web admin through the same API routes.
--
-- 1. Timed restriction. Safeguarding can stop someone posting for 1, 7 or 30
--    days without suspending them: they keep reading their groups and still
--    count towards each group's adult/member rules (so restricting someone
--    never pauses a group). It lifts itself: there is no job to undo it, the
--    check simply compares against now().
--
--    Enforced by triggers on d1_messages and d1_reactions rather than inside
--    d1_post_message, so every way a message can be written (posting,
--    forwarding, voice notes, the API's direct inserts) is covered by one
--    check that can't be forgotten when the next one is added.
--
-- 2. Escalation. A report can be escalated to the Designated Safeguarding Lead.
--    The report stays in 'reviewing' (the status set the web admin already
--    understands); escalated_at/escalated_by record that it went up a level.

-- ── 1. Restrictions ─────────────────────────────────────────────────────────

alter table public.d1_members
  add column if not exists posting_restricted_until timestamptz;

comment on column public.d1_members.posting_restricted_until is
  'While now() is before this, the member can read but not post or react. Set by safeguarding; lifts itself.';

create or replace function public.d1_enforce_posting_restriction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid;
  until timestamptz;
begin
  -- Two tables, two column names. An `if` rather than a `case`: PL/pgSQL
  -- resolves every field a `case` mentions, and d1_messages has no member_id.
  if tg_table_name = 'd1_messages' then
    who := new.sender_id;
  else
    who := new.member_id;
  end if;
  if who is null then
    return new;
  end if;

  select posting_restricted_until into until from public.d1_members where id = who;
  if until is not null and until > now() then
    raise exception 'You can read your groups but can''t post until %.',
      to_char(until at time zone 'Europe/London', 'FMDD FMMonth at HH24:MI')
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists d1_messages_posting_restriction on public.d1_messages;
create trigger d1_messages_posting_restriction
  before insert on public.d1_messages
  for each row execute function public.d1_enforce_posting_restriction();

drop trigger if exists d1_reactions_posting_restriction on public.d1_reactions;
create trigger d1_reactions_posting_restriction
  before insert on public.d1_reactions
  for each row execute function public.d1_enforce_posting_restriction();

-- ── 2. Escalation ───────────────────────────────────────────────────────────

alter table public.d1_reports
  add column if not exists escalated_at timestamptz,
  add column if not exists escalated_by uuid references auth.users (id) on delete set null;

create index if not exists d1_reports_escalated_idx
  on public.d1_reports (escalated_at desc)
  where escalated_at is not null;
