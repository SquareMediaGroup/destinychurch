-- Performance advisor fixes.

-- 1) 0006_multiple_permissive_policies — the "service writes only" deny-all
--    policies added in 20260711_02 were `FOR ALL`, so they also applied to
--    SELECT and stacked with the "Public can read active …" policy (two
--    permissive policies evaluated per anon/authenticated SELECT). They are
--    redundant: once the over-permissive "Service role has full access" policy
--    was dropped, RLS default-denies anon/authenticated writes with no explicit
--    policy needed. Dropping them keeps writes denied and leaves a single
--    SELECT policy per table (the canonical public-read + service-write shape).
drop policy if exists "service writes only" on public.redirects;
drop policy if exists "service writes only" on public.alpha_events;

-- 2) 0001_unindexed_foreign_keys — add covering indexes for FK columns so joins
--    and cascading deletes stay efficient as these tables grow.
create index if not exists order_items_product_id_idx     on public.order_items (product_id);
create index if not exists order_items_variant_id_idx      on public.order_items (variant_id);
create index if not exists playlist_items_sermon_id_idx    on public.playlist_items (sermon_id);
create index if not exists training_folders_subgroup_id_idx on public.training_folders (subgroup_id);
create index if not exists training_posts_folder_id_idx     on public.training_posts (folder_id);
