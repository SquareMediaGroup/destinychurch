-- Talent show audience voting.
--
-- Separate from the judges' buzzers (apps/talent-buzzer, LAN only). Admins add
-- the acts at /admin/talent-show; the audience scans a QR code to
-- /talent-show and picks their favourite act; /talent-show/screen shows the
-- live result on the big screen once an admin reveals it.
--
-- One vote per device per show. A device can change its vote while voting is
-- open (the row is updated, never duplicated). The device id lives in a cookie
-- and in local storage, and only its hash is stored here.
--
-- Everything is service-only: the pages talk to our API routes, which use the
-- service client. Nothing is readable with the anon key.

-- ── Settings (one row) ──────────────────────────────────────────────────────

create table if not exists public.talent_show_settings (
  id int primary key default 1 check (id = 1),
  show_name text not null default 'Talent Show' check (char_length(show_name) between 1 and 80),
  voting_open boolean not null default false,
  -- The screen shows the vote count only until this is switched on.
  results_revealed boolean not null default false,
  -- Bumped by "Clear votes" (e.g. after a rehearsal) so every device can vote again.
  round int not null default 1 check (round >= 1),
  updated_at timestamptz not null default now()
);

insert into public.talent_show_settings (id) values (1) on conflict (id) do nothing;

-- ── Acts ────────────────────────────────────────────────────────────────────

create table if not exists public.talent_show_acts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  performers text not null default '' check (char_length(performers) <= 200),
  description text not null default '' check (char_length(description) <= 300),
  sort_order int not null default 0,
  -- Hidden acts are off the voting page and the screen; their votes are kept.
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists talent_show_acts_order_idx on public.talent_show_acts (sort_order, created_at);

-- ── Votes ───────────────────────────────────────────────────────────────────

create table if not exists public.talent_show_votes (
  id uuid primary key default gen_random_uuid(),
  round int not null,
  act_id uuid not null references public.talent_show_acts (id) on delete cascade,
  -- Hashes, not raw values: enough to stop repeat votes, not enough to identify.
  device_hash text not null check (char_length(device_hash) <= 64),
  ip_hash text not null check (char_length(ip_hash) <= 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round, device_hash)
);

create index if not exists talent_show_votes_act_idx on public.talent_show_votes (round, act_id);

-- Totals per act, so the API never has to page through every vote.
create or replace view public.talent_show_vote_totals
with (security_invoker = true) as
  select round, act_id, count(*)::int as votes
  from public.talent_show_votes
  group by round, act_id;

alter table public.talent_show_settings enable row level security;
alter table public.talent_show_acts enable row level security;
alter table public.talent_show_votes enable row level security;

-- New tables, so there is no earlier policy to drop.
create policy "service only" on public.talent_show_settings using (false) with check (false);
create policy "service only" on public.talent_show_acts using (false) with check (false);
create policy "service only" on public.talent_show_votes using (false) with check (false);

revoke all on public.talent_show_vote_totals from anon, authenticated;

comment on table public.talent_show_settings is
  'Talent show voting: show name, voting open, results revealed, current round. One row. Service-only.';
comment on table public.talent_show_acts is
  'Talent show voting: the acts the audience can vote for. Service-only.';
comment on table public.talent_show_votes is
  'Talent show voting: one row per device per round. Service-only; devices and IPs are stored hashed.';
