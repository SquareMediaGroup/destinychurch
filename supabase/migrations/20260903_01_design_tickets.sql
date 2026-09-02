-- Design Tickets — the in-house request queue for graphic design work.
--
-- One place a request is raised, claimed by a designer, worked, delivered as a
-- downloadable file, and revised if it isn't right. Requests come from the
-- public /design-request page: a name and email are always required, so a
-- ticket is never anonymous, and someone who was signed in when they filed is
-- fast-tracked (see lib/designTickets.server.ts's resolveRequesterIdentity).
--
-- Deliverables live in Playbook (lib/playbook.server.ts), not Supabase Storage.
-- Only the asset token is stored here; every download mints a short-lived
-- signed URL. No permalink is ever requested for a design asset — downloads
-- are always by a known person following a fresh link, so the permanent-URL
-- plan cap stays unspent.
--
-- Access model matches hr_*: RLS on, one service-only policy, every read and
-- write through a service-role route. /api/admin/design/* is gated by
-- middleware.ts + the design_admin role; /api/design-request/* is public but
-- scoped to a ticket's share_token.

-- A uuid is unusable in an email subject or over the phone, and an integer
-- primary key would let anyone count the church's design requests. So: uuid pk,
-- plus a separate sequence for the human reference (rendered "DT-0007").
create sequence if not exists design_ticket_ref_seq start 1;

-- search_path is pinned empty, matching hr_set_updated_at and
-- shop_set_updated_at: a trigger function with a mutable search_path can be
-- steered by whatever the calling session has set.
create or replace function design_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

/* ── Tickets ──────────────────────────────────────────────────────────────── */

create table if not exists design_tickets (
  id                     uuid primary key default gen_random_uuid(),
  ref                    integer not null unique default nextval('design_ticket_ref_seq'),

  -- The brief
  title                  text not null,
  brief                  text not null,
  category               text not null default 'other'
                           check (category in ('social','print','apparel','signage','web','video','other')),
  needed_by              date,
  specs                  text,

  -- Who asked. Not null: the public form always collects both, so that every
  -- ticket has someone to send the tracking link and the finished files to.
  requester_name         text not null,
  requester_email        text not null,
  requester_phone        text,

  -- Set only when the request was filed from a live session. Identity is never
  -- taken from the form — see resolveRequesterIdentity.
  requester_auth_user_id uuid,
  requester_staff_id     uuid references hr_staff (id) on delete set null,
  requester_verified     boolean not null default false,

  priority               text not null default 'normal'
                           check (priority in ('normal','fast_track')),

  status                 text not null default 'open'
                           check (status in ('open','claimed','in_progress','delivered',
                                             'changes_requested','closed','cancelled')),

  -- Bumped each time the ticket goes back round. Deliverables are stamped with
  -- the revision they belong to, so "the latest files" is a filter rather than
  -- a mutation and every earlier round stays downloadable.
  revision               integer not null default 1,

  -- Who is doing it. Email rather than a foreign key because a designer is an
  -- admin_roles row, and admin_roles has no target worth pointing at from here.
  assignee_email         text,
  assignee_name          text,
  assignee_auth_user_id  uuid,
  assigned_at            timestamptz,

  -- The tokenised page the requester is emailed. 128 bits, generated here so it
  -- is never derived from the ref, the id or the email.
  share_token            text not null unique default encode(gen_random_bytes(16), 'hex'),

  -- One shared Playbook board backs the whole module, but the token is stored
  -- per ticket so moving to board-per-ticket later is a backfill, not a migration.
  playbook_board_token   text,

  delivered_at           timestamptz,
  closed_at              timestamptz,
  resolution_note        text,

  -- sha256(ip + salt). Abuse throttling only; the raw IP is never stored.
  requester_ip_hash      text,

  -- Denormalised so the queue can sort by "gone quietest" without a join.
  last_activity_at       timestamptz not null default now(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table design_tickets enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'design_tickets'
                   and policyname = 'service only')
  then
    create policy "service only" on design_tickets using (false) with check (false);
  end if;
end $$;

drop trigger if exists design_tickets_updated_at on design_tickets;
create trigger design_tickets_updated_at
  before update on design_tickets
  for each row execute function design_set_updated_at();

create index if not exists design_tickets_queue_idx
  on design_tickets (status, priority, created_at desc);
create index if not exists design_tickets_assignee_idx
  on design_tickets (assignee_auth_user_id, status);
create index if not exists design_tickets_staff_idx
  on design_tickets (requester_staff_id, created_at desc);
-- Lowercased so /portal can also surface tickets a staff member filed while
-- signed out, matched on their address rather than a session.
create index if not exists design_tickets_email_idx
  on design_tickets (lower(requester_email), created_at desc);
create index if not exists design_tickets_ip_throttle_idx
  on design_tickets (requester_ip_hash, created_at desc);

/* ── Deliverables (metadata only — the bytes are in Playbook) ─────────────── */

create table if not exists design_ticket_deliverables (
  id                   uuid primary key default gen_random_uuid(),
  ticket_id            uuid not null references design_tickets (id) on delete cascade,
  revision             integer not null default 1,
  playbook_asset_token text not null,
  file_name            text not null,
  mime_type            text,
  size_bytes           bigint,
  uploaded_by_email    text,
  created_at           timestamptz not null default now(),
  unique (ticket_id, playbook_asset_token)
);

alter table design_ticket_deliverables enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'design_ticket_deliverables'
                   and policyname = 'service only')
  then
    create policy "service only" on design_ticket_deliverables using (false) with check (false);
  end if;
end $$;

create index if not exists design_ticket_deliverables_ticket_idx
  on design_ticket_deliverables (ticket_id, revision desc, created_at desc);

/* ── The thread ───────────────────────────────────────────────────────────── */

-- Status history and messages in one append-only table rather than two. It is
-- what lets the admin panel and the requester's page render from a single
-- ordered query, and it makes "changes requested" one row that is at once the
-- note and the transition, instead of a comment that has to be correlated with
-- a status change by timestamp.
create table if not exists design_ticket_events (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references design_tickets (id) on delete cascade,
  kind        text not null check (kind in ('status','note','change_request')),
  actor_type  text not null default 'system'
                check (actor_type in ('requester','designer','system')),
  actor_name  text,
  actor_email text,
  from_status text,
  to_status   text,
  body        text,
  -- Designer-only notes. Both requester surfaces filter these out; the default
  -- is false so forgetting the flag over-shares nothing the requester couldn't
  -- already see on their own ticket.
  is_internal boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table design_ticket_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'design_ticket_events'
                   and policyname = 'service only')
  then
    create policy "service only" on design_ticket_events using (false) with check (false);
  end if;
end $$;

create index if not exists design_ticket_events_ticket_idx
  on design_ticket_events (ticket_id, created_at asc);
