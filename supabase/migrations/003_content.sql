-- Site banner extras
alter table site_banner
  add column if not exists active boolean not null default false,
  add column if not exists link text,
  add column if not exists link_text text;

-- Ensure one default row exists
insert into site_banner (message, active)
  select '', false
  where not exists (select 1 from site_banner)
;

-- Page content (editable fields per page)
create table if not exists page_content (
  page text not null,
  key  text not null,
  value text not null default '',
  updated_at timestamptz not null default now(),
  primary key (page, key)
);

insert into page_content (page, key, value) values
  ('give', 'account_name',   'Destiny Church Tees Valley'),
  ('give', 'sort_code',      '08-92-99'),
  ('give', 'account_number', '67397646'),
  ('give', 'text_keyword',   'DCTEES'),
  ('give', 'text_number',    '07380 307 800'),
  ('general', 'service_day',     'Sunday'),
  ('general', 'service_time',    '11am'),
  ('general', 'service_address', 'Destiny Centre, Norton Road, Stockton-on-Tees')
on conflict do nothing;
