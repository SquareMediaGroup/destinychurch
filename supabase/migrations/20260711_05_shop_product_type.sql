-- Adds a product_type to distinguish clothing (colour/size matrix) from
-- books (format chooser) and other goods (free-form custom variants).
alter table products
  add column if not exists product_type text not null default 'clothing'
  check (product_type in ('clothing', 'books', 'other'));
