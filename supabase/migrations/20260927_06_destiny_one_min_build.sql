-- Destiny One: forced update + maintenance switch.
--
-- The app reads these (via the public GET /api/app/v1/one/config) before
-- sign-in. Staff raise a platform's minimum build in /admin/destiny-one/settings
-- to retire a bad or incompatible build without an App Store release; a
-- maintenance message takes the whole app offline with that message.
--
-- d1_settings is already RLS "service only", so no policy changes are needed.

alter table public.d1_settings
  add column if not exists min_build_ios integer not null default 1 check (min_build_ios >= 1),
  add column if not exists min_build_android integer not null default 1 check (min_build_android >= 1),
  add column if not exists force_update_message text check (char_length(force_update_message) <= 500),
  add column if not exists maintenance_message text check (char_length(maintenance_message) <= 500);
