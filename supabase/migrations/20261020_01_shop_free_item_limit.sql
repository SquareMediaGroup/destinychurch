-- Shop: one free item per customer.
--
-- Free items (price 0) are limited to one per customer, ever. The shop is guest
-- checkout, so the customer is identified by their (lower-cased) email. A
-- unique row here is the claim: the checkout inserts it before completing an
-- order that contains a free item, so two checkouts racing with the same email
-- cannot both get one. Access mirrors the other shop tables (service only).

create table if not exists shop_free_item_claims (
  email      text primary key check (email = lower(email)),
  order_id   uuid references orders (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table shop_free_item_claims enable row level security;
create policy "service only" on shop_free_item_claims using (false) with check (false);

-- Backfill: anyone who already received a free item keeps their claim.
insert into shop_free_item_claims (email, order_id, created_at)
select distinct on (lower(o.customer_email))
  lower(o.customer_email), o.id, coalesce(o.paid_at, o.created_at)
from orders o
join order_items oi on oi.order_id = o.id
where oi.unit_price_pennies = 0
  and o.status in ('paid', 'fulfilled')
order by lower(o.customer_email), coalesce(o.paid_at, o.created_at)
on conflict (email) do nothing;
