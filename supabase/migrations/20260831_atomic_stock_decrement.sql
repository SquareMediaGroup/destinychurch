-- Atomic stock decrement to avoid a lost-update race when two orders for the
-- same variant finalize concurrently (e.g. two Stripe webhook deliveries).
-- The update happens in a single statement instead of a separate
-- select-then-update round trip, so concurrent calls serialize on the row
-- lock Postgres already takes for the UPDATE.
create or replace function decrement_variant_stock(p_variant_id uuid, p_quantity integer)
returns void
language sql
security definer
set search_path = public
as $$
  update product_variants
  set stock = greatest(0, stock - p_quantity)
  where id = p_variant_id;
$$;
