-- Security hardening flagged by Supabase advisors.

-- Public buckets serve objects via their public URL without needing a SELECT
-- policy; the broad SELECT policies only added the ability for anyone to LIST
-- every file in the bucket. All server-side storage access uses the service
-- role, which bypasses RLS, so nothing depends on these.
drop policy if exists "Public can read builder-media" on storage.objects;
drop policy if exists "popup_images_public_read" on storage.objects;

-- Pin search_path on trigger functions so they cannot be hijacked by objects
-- created in roles' mutable search paths (advisor: function_search_path_mutable).
alter function public.update_builder_media_updated_at() set search_path = '';
alter function public.hr_set_updated_at() set search_path = '';
