-- Destiny One: the Bible connection and verse cards (1.1).
--
-- Bible text comes from the YouVersion Platform API, called only by our API on
-- Vercel (lib/destinyOne/bible.server.ts) with the YOUVERSION_APP_KEY secret.
-- The app never talks to YouVersion, so the key stays secret and no member data
-- leaves our servers: all YouVersion ever sees is which passage and which Bible.
--
--   d1_settings.bible_id      the church's default Bible version (YouVersion id;
--                             113 is the NIV UK). Changed in the admin area.
--   d1_messages.verse_ref     a message's verse card: the passage it mentions,
--                             found by the server after sending, stored sealed
--                             like the text ({"passageId","bibleId"}). Only the
--                             reference is kept with the message, never the words.
--   d1_bible_passages         the words, cached for everyone so we stay under
--                             YouVersion's hourly limit. Rows older than the cache
--                             window (D1_BIBLE_CACHE_HOURS, 24 by default, to be
--                             set from the publisher's licence) are refetched and
--                             removed.
--   d1_bible_versions         each version's name, abbreviation and copyright line
--                             (shown under every passage, as YouVersion requires).
--   d1_bible_votd             which passage is the verse of the day, per UK date:
--                             one YouVersion call a day for everyone.
--
-- Bible text is reference material, not member data: it is not sealed. None of
-- these tables is reachable with a browser key.

alter table public.d1_settings add column if not exists bible_id integer not null default 113 check (bible_id > 0);
comment on column public.d1_settings.bible_id is 'The church''s default Bible version (YouVersion Platform id). 113 = NIV UK.';

alter table public.d1_messages add column if not exists verse_ref text;
alter table public.d1_messages drop constraint if exists d1_messages_verse_ref_sealed;
alter table public.d1_messages add constraint d1_messages_verse_ref_sealed check (verse_ref is null or verse_ref like 'd1e:%');
comment on column public.d1_messages.verse_ref is 'The verse card: sealed {"passageId","bibleId"} of the first reference in the message. Null for none.';

create table if not exists public.d1_bible_passages (
  bible_id integer not null,
  passage_id text not null check (char_length(passage_id) between 3 and 40),
  reference text not null,
  content text not null,
  fetched_at timestamptz not null default now(),
  primary key (bible_id, passage_id)
);
create index if not exists d1_bible_passages_age_idx on public.d1_bible_passages (fetched_at);

create table if not exists public.d1_bible_versions (
  bible_id integer primary key,
  abbreviation text not null,
  title text not null,
  copyright text,
  fetched_at timestamptz not null default now()
);

create table if not exists public.d1_bible_votd (
  day date primary key,
  passage_id text not null,
  fetched_at timestamptz not null default now()
);

alter table public.d1_bible_passages enable row level security;
alter table public.d1_bible_versions enable row level security;
alter table public.d1_bible_votd enable row level security;
drop policy if exists "service only" on public.d1_bible_passages;
create policy "service only" on public.d1_bible_passages using (false) with check (false);
drop policy if exists "service only" on public.d1_bible_versions;
create policy "service only" on public.d1_bible_versions using (false) with check (false);
drop policy if exists "service only" on public.d1_bible_votd;
create policy "service only" on public.d1_bible_votd using (false) with check (false);
revoke all on table public.d1_bible_passages, public.d1_bible_versions, public.d1_bible_votd from public, anon, authenticated;
grant select, insert, update, delete on table public.d1_bible_passages, public.d1_bible_versions, public.d1_bible_votd to service_role;
