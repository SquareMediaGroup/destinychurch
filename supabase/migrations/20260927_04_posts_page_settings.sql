-- Posts: page-level presentation settings.
-- Deliberately a handful of presets rather than free-form styling — admins
-- choose how the page opens (hero style), what it says when shared
-- (description / share image), and whether the promo rails show. Nothing
-- per-element, which is what keeps the editor simple.

alter table posts
  add column if not exists hero_style     text    not null default 'plain',
  add column if not exists hero_image_url text,
  add column if not exists subtitle       text,
  add column if not exists description    text,
  add column if not exists og_image_url   text,
  add column if not exists show_rails     boolean not null default true;

alter table posts drop constraint if exists posts_hero_style_check;
alter table posts
  add constraint posts_hero_style_check check (hero_style in ('plain', 'image', 'banner'));
