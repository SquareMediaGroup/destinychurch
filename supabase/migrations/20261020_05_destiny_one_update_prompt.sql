-- Destiny One: optional "update available" prompt.
--
-- Staff set the newest version in the stores (e.g. "0.13") and what's in it at
-- /admin/destiny-one/settings. The app reads them from the public
-- GET /api/app/v1/one/config, and when its own X.X is older it shows a
-- dismissible prompt once per version. Patch numbers are ignored, so a 0.13.1
-- never prompts someone on 0.13.0. Blank latest_version turns it off.
--
-- d1_settings is already RLS "service only", so no policy changes are needed.

alter table public.d1_settings
  add column if not exists latest_version text check (latest_version ~ '^[0-9]{1,4}\.[0-9]{1,4}(\.[0-9]{1,4})?$'),
  add column if not exists latest_version_notes text check (char_length(latest_version_notes) <= 1000);
