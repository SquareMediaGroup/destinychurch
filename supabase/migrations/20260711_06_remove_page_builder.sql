-- Remove the AI page builder feature: drop its tables.
-- The builder-media storage bucket (public, ~16 objects) must be deleted
-- separately via the Supabase Storage API/dashboard — storage.objects
-- cannot be deleted with a direct DELETE in migrations.
drop table if exists public.builder_pages cascade;
drop table if exists public.builder_templates cascade;
drop table if exists public.builder_media cascade;
