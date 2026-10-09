-- Security audit 2026-10-09: drop the "any signed-in user can write" storage
-- policies on the four public site buckets.
--
-- These were added when the admin uploaded straight from the browser. Every
-- upload and delete now goes through an /api/admin route on the service-role
-- client (which bypasses RLS), so nothing uses them. Meanwhile every Destiny
-- One member and staff-portal user holds an `authenticated` session, which let
-- any of them overwrite or delete product images, shop banners and post media
-- with the publishable key from the app bundle.
--
-- Public read policies are untouched. With these gone, writes to these buckets
-- are service-role only.

drop policy if exists "Authenticated users can upload builder-media" on storage.objects;
drop policy if exists "Authenticated users can update builder-media" on storage.objects;
drop policy if exists "Authenticated users can delete builder-media" on storage.objects;

drop policy if exists "Authenticated users can upload post-media" on storage.objects;
drop policy if exists "Authenticated users can update post-media" on storage.objects;
drop policy if exists "Authenticated users can delete post-media" on storage.objects;

drop policy if exists "Authenticated users can upload product-images" on storage.objects;
drop policy if exists "Authenticated users can update product-images" on storage.objects;
drop policy if exists "Authenticated users can delete product-images" on storage.objects;

drop policy if exists "Authenticated users can upload shop-hero-images" on storage.objects;
drop policy if exists "Authenticated users can update shop-hero-images" on storage.objects;
drop policy if exists "Authenticated users can delete shop-hero-images" on storage.objects;
