-- Add a product-level "fit" audience (drives the size chart in the admin editor
-- and shows as a label on the storefront). Male/Female/Unisex share the adult
-- size chart; Kids uses age-based sizes.
alter table products
  add column if not exists fit text not null default 'unisex'
  check (fit in ('male','female','unisex','kids'));
