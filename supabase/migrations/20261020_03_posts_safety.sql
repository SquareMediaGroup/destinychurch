-- Posts: the "safety" round of admin improvements.
--
-- 1. Drafts of live pages. `draft` holds unpublished edits to a published
--    post's content (title, slug, body, header, description, share image,
--    rails). The public page keeps serving the live columns until someone
--    presses "Publish changes", which copies the draft over them and clears
--    it. Preview links show the draft. A post that has never been published
--    doesn't use this column: it is all draft already.
--
-- 2. Scheduling. A published post is only served between publish_from and
--    publish_until (either may be null). The /[slug] page reads the database on
--    every request, so no cron is needed to take a page down on time.
--
-- 3. History. post_revisions keeps a snapshot of every save (draft or publish)
--    so an admin can bring back an earlier version. The API keeps the newest
--    30 per post.

alter table posts
  add column if not exists draft         jsonb,
  add column if not exists publish_from  timestamptz,
  add column if not exists publish_until timestamptz;

alter table posts drop constraint if exists posts_schedule_order_check;
alter table posts
  add constraint posts_schedule_order_check
  check (publish_from is null or publish_until is null or publish_until > publish_from);

create table if not exists post_revisions (
  id         uuid        primary key default gen_random_uuid(),
  post_id    uuid        not null references posts (id) on delete cascade,
  kind       text        not null check (kind in ('draft', 'published')),
  snapshot   jsonb       not null,  -- the content fields as saved
  created_by text,                  -- admin name (or email)
  created_at timestamptz not null default now()
);

create index if not exists post_revisions_post_idx on post_revisions (post_id, created_at desc);

-- Same access model as posts: service role only, all access through the API.
alter table post_revisions enable row level security;
drop policy if exists "service only" on post_revisions;
create policy "service only" on post_revisions using (false) with check (false);
