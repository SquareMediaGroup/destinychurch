-- Posts: the "quick wins" round of admin improvements.
--
--   hide_from_search     keeps a page out of the sitemap and adds noindex (a
--                        page meant only for people holding the QR code) —
--                        the same switch link pages already have.
--   tags                 free-text labels for grouping the admin list
--                        ("Alpha", "Easter 2027"). Admin-only, never shown
--                        on the public page.
--   deleted_at           the Bin. Deleting moves a post here; it is purged
--                        for good 30 days later by the admin list endpoint.
--                        A binned post still holds its slug, so restoring it
--                        can't collide with a page created in the meantime.
--   updated_by           the admin name (or email) of whoever last saved,
--                        captured at save time for the list's "edited by".
--   review_link_version  part of every signed preview token. Bumping it
--                        revokes every outstanding review link at once.
--
-- Page views: published posts now log a `post_view` engagement event (see
-- lib/engagement.ts). post_view_counts() aggregates them in Postgres so the
-- admin list never downloads raw events to count them.

alter table posts
  add column if not exists hide_from_search    boolean     not null default false,
  add column if not exists tags                text[]      not null default '{}',
  add column if not exists deleted_at          timestamptz,
  add column if not exists updated_by          text,
  add column if not exists review_link_version integer     not null default 0;

create index if not exists posts_deleted_at_idx on posts (deleted_at) where deleted_at is not null;

create or replace function post_view_counts(p_since timestamptz)
returns table (post_id text, views bigint)
language sql
stable
security definer
set search_path = public
as $$
  select target_key, count(*)
  from engagement_events
  where source = 'post_view'
    and is_bot = false
    and created_at >= p_since
  group by target_key;
$$;

revoke all on function post_view_counts(timestamptz) from public;
grant execute on function post_view_counts(timestamptz) to service_role;
