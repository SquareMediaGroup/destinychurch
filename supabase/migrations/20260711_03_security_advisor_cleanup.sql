-- Security advisor cleanup — clears the remaining Supabase linter WARNs.
-- All changes verified safe against the app: uploads/writes use the service_role
-- key (bypasses RLS), there is no public signup (so `authenticated` = staff only),
-- the app never calls storage .list()/.download(), and the four image buckets are
-- public (objects served via getPublicUrl without any SELECT policy).

-- 1) 0011_function_search_path_mutable — pin the trigger function's search_path.
--    Body only uses now() (pg_catalog, always in path) and NEW, so '' is safe.
alter function public.shop_set_updated_at() set search_path = '';

-- 2) 0025_public_bucket_allows_listing — stop anonymous directory listing of the
--    public buckets. Object URLs (getPublicUrl) keep working; only .list() is
--    removed. popup-images' lone policy was an authenticated ALL policy that is
--    likewise unnecessary (popup uploads use the service client).
drop policy if exists "Public can read post-media"        on storage.objects;
drop policy if exists "Public can read product-images"    on storage.objects;
drop policy if exists "Public can read shop-hero-images"   on storage.objects;
drop policy if exists "popup_images_authenticated_all"     on storage.objects;

-- 3) 0024_rls_policy_always_true — remove permissive `authenticated ... USING(true)`
--    write policies on builder_media. Writes go through /api/admin/* with the
--    service_role key, so these are not load-bearing; RLS then default-denies
--    non-service writes. The SELECT read policy is left intact.
drop policy if exists "Authenticated users can insert builder_media" on public.builder_media;
drop policy if exists "Authenticated users can update builder_media" on public.builder_media;
drop policy if exists "Authenticated users can delete builder_media" on public.builder_media;
