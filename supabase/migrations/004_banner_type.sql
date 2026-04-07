-- Add type column to site_banner for announcement / notice / sitewide
alter table site_banner
  add column if not exists type text not null default 'announcement';
