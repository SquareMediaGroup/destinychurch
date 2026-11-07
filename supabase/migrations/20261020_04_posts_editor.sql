-- Posts: the editor round of admin improvements.
--
-- 1. Saved templates. "Save as template" in the editor stores a post's content
--    and page settings here; they appear next to the built-in starters in the
--    New post picker (lib/postTemplates.ts holds the built-in ones in code).
--
-- 2. Ready for review. A writer can ask for sign-off: review_requested_at/_by
--    mark the post, a bell notification goes to Posts admins, and publishing
--    clears it.
--
-- 3. Who's editing. post_editing holds a heartbeat per (post, admin) from the
--    open editor, so a second person opening the same page sees "Sam is
--    editing". Polled over the API rather than Realtime presence, which would
--    need a realtime.messages policy for a feature that only has to be roughly
--    live. Rows older than a couple of minutes are ignored and swept.

create table if not exists post_templates (
  id          uuid        primary key default gen_random_uuid(),
  label       text        not null check (char_length(label) between 1 and 80),
  description text        check (description is null or char_length(description) <= 200),
  fields      jsonb       not null,   -- Partial<PostFields>: content + page settings
  created_by  text,
  created_at  timestamptz not null default now()
);

alter table post_templates enable row level security;
drop policy if exists "service only" on post_templates;
create policy "service only" on post_templates using (false) with check (false);

alter table posts
  add column if not exists review_requested_at timestamptz,
  add column if not exists review_requested_by text;

create table if not exists post_editing (
  post_id      uuid        not null references posts (id) on delete cascade,
  auth_user_id uuid        not null,
  name         text,
  seen_at      timestamptz not null default now(),
  primary key (post_id, auth_user_id)
);

create index if not exists post_editing_seen_idx on post_editing (seen_at);

alter table post_editing enable row level security;
drop policy if exists "service only" on post_editing;
create policy "service only" on post_editing using (false) with check (false);
