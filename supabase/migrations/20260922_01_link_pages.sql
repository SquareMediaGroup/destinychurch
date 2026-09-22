-- Links pages: the Linktree-style pages at /links and /links/<slug>.
--
-- Until now /links was six hardcoded "Next Steps" cards (lib/linksSteps.ts).
-- It becomes an admin-built page — profile, socials, a stack of blocks and a
-- theme — and there can be more than one: `main` renders at /links, every
-- other slug at /links/<slug> (a youth page, an Alpha page, a conference).
--
-- Three tables:
--   link_pages             — one row per page: profile, socials, theme, SEO.
--   link_blocks            — the ordered stack on a page. `type` says which
--                            renderer; `data` holds that type's settings and is
--                            validated by zod in lib/linkPages/types.ts before
--                            every write, the same split posts use for blocks.
--   link_form_submissions  — what visitors send through a form block. Personal
--                            data, so service-only: no public policy at all.
--
-- Writes follow the repo convention: no write policies, every write goes
-- through app/api/admin/links/* with the service client, and middleware +
-- ROUTE_RULES are the authorisation boundary.

create table if not exists public.link_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default '',
  bio text not null default '',
  avatar_url text,
  -- Parsed by ThemeSchema (lib/linkPages/theme.ts). Anything missing falls back
  -- to the Destiny Light defaults, so '{}' is a valid, finished theme.
  theme jsonb not null default '{}'::jsonb,
  -- [{ "platform": "instagram", "url": "https://…" }, …]
  socials jsonb not null default '[]'::jsonb,
  socials_position text not null default 'top',
  seo_title text,
  seo_description text,
  og_image_url text,
  noindex boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint link_pages_slug_format
    check (slug ~ '^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$'),
  constraint link_pages_title_len check (char_length(title) <= 80),
  constraint link_pages_bio_len check (char_length(bio) <= 300),
  constraint link_pages_socials_position
    check (socials_position in ('top', 'bottom')),
  constraint link_pages_socials_array check (jsonb_typeof(socials) = 'array'),
  constraint link_pages_theme_object check (jsonb_typeof(theme) = 'object')
);

create table if not exists public.link_blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.link_pages(id) on delete cascade,
  sort_order integer not null default 0,
  active boolean not null default true,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  -- Optional schedule, Linktree-style: hidden before starts_at and after
  -- ends_at. Evaluated on the server clock at render time.
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint link_blocks_type_check
    check (type in ('link', 'header', 'text', 'image', 'divider', 'event', 'embed', 'form')),
  constraint link_blocks_data_object check (jsonb_typeof(data) = 'object'),
  constraint link_blocks_schedule_order
    check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create index if not exists link_blocks_page_order_idx
  on public.link_blocks (page_id, active, sort_order);

create table if not exists public.link_form_submissions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid references public.link_pages(id) on delete cascade,
  -- set null, not cascade: deleting a form block must not delete what people
  -- already sent through it. block_label keeps the form's name regardless.
  block_id uuid references public.link_blocks(id) on delete set null,
  block_label text,
  email text,
  -- [{ "id", "label", "value" }] in the form's field order. An array because
  -- jsonb objects don't keep key order. The label is captured at submit time,
  -- so renaming a field later doesn't relabel old responses.
  data jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists link_form_submissions_page_idx
  on public.link_form_submissions (page_id, created_at desc);
create index if not exists link_form_submissions_block_idx
  on public.link_form_submissions (block_id);

alter table public.link_pages enable row level security;
alter table public.link_blocks enable row level security;
alter table public.link_form_submissions enable row level security;

-- Reads go through createServiceClient() on the server; these match the
-- nfc_tiles precedent so the tables aren't deny-all if a client read is added.
drop policy if exists "link_pages_public_read_published" on public.link_pages;
create policy "link_pages_public_read_published"
  on public.link_pages for select
  using (published = true);

drop policy if exists "link_blocks_public_read_active" on public.link_blocks;
create policy "link_blocks_public_read_active"
  on public.link_blocks for select
  using (
    active = true
    and exists (
      select 1 from public.link_pages p
      where p.id = link_blocks.page_id and p.published = true
    )
  );

drop policy if exists "service only" on public.link_form_submissions;
create policy "service only"
  on public.link_form_submissions
  using (false) with check (false);

-- Save a page and its whole block stack in one transaction.
--
-- The editor saves the page as a unit — reorders, edits, additions and
-- deletions together — so doing that as N separate PostgREST calls could leave
-- a page half-saved (blocks deleted, replacements not yet written) if one
-- failed. Array position is the sort order. Block ids are generated in the
-- browser so they are stable across saves; the `where` on the upsert stops a
-- request from moving another page's block onto this one by naming its id.
create or replace function public.link_page_save(
  p_page_id uuid,
  p_page jsonb,
  p_blocks jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.link_pages set
    slug             = p_page->>'slug',
    title            = coalesce(p_page->>'title', ''),
    bio              = coalesce(p_page->>'bio', ''),
    avatar_url       = nullif(p_page->>'avatar_url', ''),
    theme            = coalesce(p_page->'theme', '{}'::jsonb),
    socials          = coalesce(p_page->'socials', '[]'::jsonb),
    socials_position = coalesce(p_page->>'socials_position', 'top'),
    seo_title        = nullif(p_page->>'seo_title', ''),
    seo_description  = nullif(p_page->>'seo_description', ''),
    og_image_url     = nullif(p_page->>'og_image_url', ''),
    noindex          = coalesce((p_page->>'noindex')::boolean, false),
    published        = coalesce((p_page->>'published')::boolean, true),
    updated_at       = now()
  where id = p_page_id;

  if not found then
    raise exception 'link page % not found', p_page_id;
  end if;

  delete from public.link_blocks
  where page_id = p_page_id
    and id not in (
      select (b->>'id')::uuid
      from jsonb_array_elements(p_blocks) b
      where b->>'id' is not null
    );

  insert into public.link_blocks
    (id, page_id, sort_order, active, type, data, starts_at, ends_at)
  select
    (t.b->>'id')::uuid,
    p_page_id,
    (t.ord - 1)::integer,
    coalesce((t.b->>'active')::boolean, true),
    t.b->>'type',
    coalesce(t.b->'data', '{}'::jsonb),
    nullif(t.b->>'starts_at', '')::timestamptz,
    nullif(t.b->>'ends_at', '')::timestamptz
  from jsonb_array_elements(p_blocks) with ordinality as t(b, ord)
  on conflict (id) do update set
    sort_order = excluded.sort_order,
    active     = excluded.active,
    type       = excluded.type,
    data       = excluded.data,
    starts_at  = excluded.starts_at,
    ends_at    = excluded.ends_at,
    updated_at = now()
  where public.link_blocks.page_id = p_page_id;
end;
$$;

revoke all on function public.link_page_save(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.link_page_save(uuid, jsonb, jsonb) to service_role;

-- Seed: the main page, carrying over the six Next Steps cards that /links has
-- always shown, so the switch-over changes the look but loses nothing.
do $$
declare
  v_page uuid;
begin
  if exists (select 1 from public.link_pages where slug = 'main') then
    return;
  end if;

  insert into public.link_pages (slug, title, bio, seo_title, seo_description)
  values (
    'main',
    'Destiny Church Tees Valley',
    'Take your next step with us.',
    'Next Steps',
    'Your next step at Destiny Church Tees Valley — get baptised, join a team or connect group, dedicate your child, explore a course, or give.'
  )
  returning id into v_page;

  insert into public.link_blocks (page_id, sort_order, type, data) values
    (v_page, 0, 'link', '{"title":"Baptism","subtitle":"Go public with your faith.","url":"/baptism","icon":"water_drop"}'),
    (v_page, 1, 'link', '{"title":"Joining a Team","subtitle":"Use your gifts and serve.","url":"/serve","icon":"diversity_3"}'),
    (v_page, 2, 'link', '{"title":"Joining a Connect Group","subtitle":"Find your people midweek.","url":"/connect","icon":"groups"}'),
    (v_page, 3, 'link', '{"title":"Dedicating your Child","subtitle":"Celebrate and bless the little ones.","url":"/child-dedication","icon":"child_care"}'),
    (v_page, 4, 'link', '{"title":"Courses","subtitle":"Explore life, faith and meaning.","url":"/alpha","icon":"menu_book"}'),
    (v_page, 5, 'link', '{"title":"Giving","subtitle":"Partner with the vision.","url":"/give","icon":"volunteer_activism"}');
end $$;
