-- Destiny One part 7: message text encrypted at rest.
--
-- The API now seals message bodies, poll wording and report reasons with
-- AES-256-GCM before they reach this database, and opens them on the way out
-- (lib/destinyOne/sealing.ts + crypto.server.ts). The key lives in Vercel, not
-- here, so a dump, a backup/PITR snapshot, SQL access or a leaked service key
-- on its own shows ciphertext. Not end-to-end: the API can still read
-- everything, which is what keeps safeguarding review working.
--
--   1. Search moves from a tsvector over the body (useless on ciphertext) to
--      a blind index: d1_message_terms holds keyed hashes of word prefixes,
--      computed by the API, and d1_search_messages matches on those.
--   2. Length checks are loosened to fit ciphertext. The real limits (4000
--      characters a message, 1000 a reason) are enforced by the API schemas.
--   3. Messages stay immutable, except for the one-off change from plaintext
--      to its sealed form, which the backfill needs. Migration 20261004_02
--      then requires every row to be sealed, so that path can't fire again.
--   4. d1_post_message no longer broadcasts the message. realtime.send stores
--      every payload in realtime.messages for three days, which would keep a
--      readable copy; the API broadcasts the opened message over Realtime's
--      REST endpoint instead, which stores nothing. Existing stored copies
--      are removed.
--
-- Apply with (or straight after) the deploy that ships the API side: the old
-- API searches with d1_search_messages(uuid, text, integer), dropped here.

-- ── 1. Blind search index ───────────────────────────────────────────────────

alter table public.d1_messages drop column if exists search; -- drops d1_messages_search_idx with it
drop function if exists public.d1_search_messages(uuid, text, integer);

create table if not exists public.d1_message_terms (
  group_id uuid not null references public.d1_groups (id) on delete cascade,
  term text not null check (term ~ '^[0-9a-f]{32}$'),
  message_id bigint not null references public.d1_messages (id) on delete cascade,
  primary key (group_id, term, message_id)
);

create index if not exists d1_message_terms_message_idx on public.d1_message_terms (message_id);

comment on table public.d1_message_terms is
  'Blind search index: HMACs (keyed per group, by the API) of every prefix of every word in a message body. No plaintext.';

alter table public.d1_message_terms enable row level security;
revoke all on table public.d1_message_terms from public, anon, authenticated;
grant select, insert, delete on table public.d1_message_terms to service_role;

-- p_terms: {"<group id>": ["<term>", …], …} — one term per search word, per
-- group the caller is searching. A message matches when it has every term.
-- Same visibility as before: groups you're in (not archived), messages since
-- you joined, never deleted, never from someone you've blocked.
create or replace function public.d1_search_messages(p_actor uuid, p_terms jsonb, p_limit integer default 30)
returns table (
  id bigint,
  group_id uuid,
  group_name text,
  community_name text,
  sender_id uuid,
  sender_name text,
  body text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with wanted as (
    select g.key::uuid as group_id, array(select distinct jsonb_array_elements_text(g.value)) as terms
    from jsonb_each(case when jsonb_typeof(p_terms) = 'object' then p_terms else '{}'::jsonb end) g
    where jsonb_typeof(g.value) = 'array'
      and g.key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  matched as (
    select t.group_id, t.message_id
    from wanted w
    join public.d1_message_terms t on t.group_id = w.group_id and t.term = any (w.terms)
    where cardinality(w.terms) > 0
    group by t.group_id, t.message_id, cardinality(w.terms)
    having count(distinct t.term) = cardinality(w.terms)
  )
  select m.id, m.group_id, g.name, c.name, m.sender_id, s.display_name, m.body, m.created_at
  from matched x
  join public.d1_group_members gm on gm.group_id = x.group_id and gm.member_id = p_actor and gm.left_at is null
  join public.d1_groups g on g.id = gm.group_id and g.state <> 'archived'
  join public.d1_communities c on c.id = g.community_id
  join public.d1_messages m on m.id = x.message_id
    and m.group_id = x.group_id
    and m.created_at >= gm.joined_at
    and m.deleted_at is null
  left join public.d1_members s on s.id = m.sender_id
  where not exists (select 1 from public.d1_blocks b
                    where b.blocker_id = p_actor and b.blocked_id = m.sender_id)
  order by m.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 50);
$$;

revoke all on function public.d1_search_messages(uuid, jsonb, integer) from public, anon, authenticated;
grant execute on function public.d1_search_messages(uuid, jsonb, integer) to service_role;

-- ── 2. Room for ciphertext ──────────────────────────────────────────────────
-- 4000 characters of UTF-8 is at most 16000 bytes; base64 plus the header
-- stays under 22000.

alter table public.d1_messages drop constraint if exists d1_messages_body_check;
alter table public.d1_messages add constraint d1_messages_body_check
  check (char_length(coalesce(body, '')) <= 24000);

alter table public.d1_reports drop constraint if exists d1_reports_reason_check;
alter table public.d1_reports add constraint d1_reports_reason_check
  check (char_length(reason) between 1 and 6000);

-- ── 3. Immutable, apart from being sealed once ──────────────────────────────

create or replace function public.d1_messages_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.body is distinct from old.body
        -- The backfill (scripts/destiny-one/encrypt-messages.mjs) replaces a
        -- plaintext body with its sealed form, once.
        and not (old.body not like 'd1e:%' and new.body like 'd1e:%'))
     or new.group_id is distinct from old.group_id
     or new.attachment_id is distinct from old.attachment_id
     or new.reply_to is distinct from old.reply_to
     or new.created_at is distinct from old.created_at
     or (new.sender_id is distinct from old.sender_id and new.sender_id is not null) then
    raise exception 'Messages cannot be edited.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- ── 4. Posting: store the search terms, broadcast nothing ───────────────────

drop function if exists public.d1_post_message(uuid, uuid, text, bigint, uuid, jsonb);

create or replace function public.d1_post_message(
  p_actor uuid,
  p_group uuid,
  p_body text,
  p_reply_to bigint default null,
  p_attachment uuid default null,
  p_content jsonb default null,
  p_terms text[] default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  mid bigint;
begin
  insert into public.d1_messages (group_id, sender_id, body, reply_to, attachment_id, content)
    values (p_group, p_actor, nullif(btrim(coalesce(p_body, '')), ''), p_reply_to, p_attachment, p_content)
    returning id into mid;

  insert into public.d1_message_terms (group_id, term, message_id)
    select distinct p_group, t, mid from unnest(coalesce(p_terms, '{}')) t;

  update public.d1_group_members set last_read_message_id = mid
    where group_id = p_group and member_id = p_actor;

  -- No d1_emit here: the API broadcasts the opened message (see header, 4).
  return mid;
end;
$$;

revoke all on function public.d1_post_message(uuid, uuid, text, bigint, uuid, jsonb, text[]) from public, anon, authenticated;
grant execute on function public.d1_post_message(uuid, uuid, text, bigint, uuid, jsonb, text[]) to service_role;

-- Readable copies of messages that d1_post_message broadcast before today.
delete from realtime.messages where topic like 'd1-group:%' and event = 'message';
