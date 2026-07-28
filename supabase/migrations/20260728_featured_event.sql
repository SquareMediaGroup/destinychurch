-- The one ChurchSuite event promoted across the site.
--
-- Events are not stored in this database — they come live from the ChurchSuite
-- public calendar feed — so "featuring an event" means holding a *pointer* to a
-- feed event plus the copy that overrides it. Admin writes the pointer and the
-- overrides; lib/events.server.ts merges them over live feed data at render
-- time, falling back to the feed for anything left blank.
--
-- Why the hero and the popup share one row rather than living in two tables:
-- the popup must always advertise the same event as the hero. Two tables means
-- either a duplicated event_identifier (which drifts — the hero advertises Kids
-- Fest while the popup still advertises Rocknations) or a foreign key that
-- reduces to one row anyway. Auto-expiry and the promote window have to apply
-- identically to both surfaces, so they are computed once, from one row.
-- Two admin pages (/admin/featured-event, /admin/event-popup) write to it.
--
-- Deliberately separate from site_popup: that stays the generic announcement
-- popup. When an event popup is live it suppresses the site popup entirely
-- (app/layout.tsx passes null to <SitePopup>), so only ever one modal shows.

create table if not exists public.featured_event (
  id integer primary key default 1,
  constraint featured_event_singleton check (id = 1),

  -- Which event. `event_sequence` is ChurchSuite's series key (null for
  -- one-offs); `event_identifier` pins the occurrence and is what the resolver
  -- looks up. The remaining columns are snapshots, used for admin display and
  -- as the feed-outage fallback described below.
  event_identifier text,
  event_sequence   integer,
  event_id         integer,
  event_name       text,
  event_slug       text,
  -- When the last session ends. fetchChurchSuiteEvents returns [] on *any*
  -- error, so without this a ChurchSuite hiccup would silently un-feature the
  -- event for five minutes. The resolver renders from the stored copy instead,
  -- but only while this is still in the future.
  event_ends_at    timestamptz,

  active boolean not null default false,
  -- Optional scheduling window. Auto-expiry after the event ends is handled in
  -- code (the feed is forward-only, so a finished event stops appearing).
  promote_from  timestamptz,
  promote_until timestamptz,

  -- Hero overrides. All nullable: blank falls back to the feed.
  headline   text,
  blurb      text,
  image_url  text,
  image_path text,
  cta_text   text,
  cta_link   text,

  -- Event popup. Falls back to the hero override, then the feed.
  popup_active     boolean not null default false,
  popup_title      text,
  popup_body       text,
  popup_image_url  text,
  popup_image_path text,
  popup_cta_text   text,
  popup_cta_link   text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint featured_event_window
    check (promote_until is null or promote_from is null or promote_until > promote_from),
  -- Cannot promote nothing.
  constraint featured_event_has_target
    check (not active or event_identifier is not null),
  -- The popup advertises the featured event, so it cannot outlive it.
  constraint featured_event_popup_needs_active
    check (not popup_active or active),
  constraint featured_event_headline_len
    check (headline is null or char_length(headline) <= 120),
  constraint featured_event_blurb_len
    check (blurb is null or char_length(blurb) <= 600),
  constraint featured_event_popup_title_len
    check (popup_title is null or char_length(popup_title) <= 120),
  constraint featured_event_popup_body_len
    check (popup_body is null or char_length(popup_body) <= 600)
);

insert into public.featured_event (id) values (1) on conflict (id) do nothing;

-- Secure-by-default, matching featured_course and 20260711_rls_harden_base_tables:
-- RLS on + deny-all. Server routes use the service key (bypasses RLS); anon and
-- authenticated get nothing. No public-read policy — every read goes through
-- createServiceClient() in lib/events.server.ts.
alter table public.featured_event enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'featured_event'
      and policyname = 'service only'
  ) then
    create policy "service only" on public.featured_event
      using (false) with check (false);
  end if;
end $$;

-- Images reuse the existing public `popup-images` bucket (created in
-- 20260502_create_site_popup.sql) with a `featured-event-` filename prefix.
-- Its policies and upload route already exist, so no storage migration here.
