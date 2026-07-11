-- Codify Row-Level Security for the base-schema tables into version control.
--
-- Context: the live database already has RLS enabled on these tables (it was
-- applied via the Supabase dashboard), but that hardening was never written
-- into schema.sql / migrations. This migration closes that drift so a rebuild
-- from source (new environment, disaster recovery) is secure-by-default and can
-- never be born with these tables publicly readable/writable via the anon key.
--
-- Model matches the existing pattern on newer tables: enable RLS + a deny-all
-- "service only" policy. The service_role / secret key bypasses RLS, so server
-- routes keep full access; anon / authenticated get nothing. Tables that need
-- public read already carry their own permissive policies (redirects,
-- alpha_events, site_popup, …) and are intentionally NOT listed here.
--
-- Idempotent and safe to re-run: only touches tables that exist, only enables
-- RLS (a no-op if already on), and only adds the deny-all policy if absent.
-- A deny-all *permissive* policy alongside an existing allow policy does not
-- tighten access (permissive policies are OR-ed), so this cannot break a table
-- that already grants public read.

do $$
declare
  t text;
  service_only_tables text[] := array[
    'sermons',
    'sermon_transcripts',
    'sermon_link_suggestions',
    'ai_reports',
    'playlists',
    'playlist_items',
    'page_content',
    'site_banner',
    'hidden_videos',
    'studio_assets',
    'studio_components',
    'service_status',
    'training_folders',
    'auth_users',
    'auth_codes',
    'admin_users'
  ];
begin
  foreach t in array service_only_tables loop
    if exists (
      select 1 from pg_tables where schemaname = 'public' and tablename = t
    ) then
      execute format('alter table public.%I enable row level security', t);
      if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = t and policyname = 'service only'
      ) then
        execute format(
          'create policy "service only" on public.%I using (false) with check (false)', t
        );
      end if;
    end if;
  end loop;
end $$;
