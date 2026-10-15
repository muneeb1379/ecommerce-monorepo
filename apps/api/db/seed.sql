-- Development sample data. Idempotent (upserts by slug). Never run in production.

insert into categories (name, slug, description, sort_order) values
  ('T-Shirts', 't-shirts', 'Everyday tees', 0),
  ('Hoodies', 'hoodies', 'Warm layers', 1),
  ('Accessories', 'accessories', 'Caps, bags and more', 2)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

with product as (
  insert into products (name, slug, description, price, compare_at_price, sku, category_id, status, stock)
  select 'Classic T Shirt', 'classic-t-shirt', 'A soft, midweight cotton tee.', 25.00, 30.00, 'TSHIRT-001', id, 'draft', 50
  from categories where slug = 't-shirts'
  on conflict (slug) do update set name = excluded.name
  returning id
)
insert into product_colors (product_id, name, hex_value, sort_order)
select product.id, c.name, c.hex, c.sort_order
from product, (values ('Black', '#000000', 0), ('White', '#FFFFFF', 1), ('Blue', '#1E3A8A', 2)) as c(name, hex, sort_order)
on conflict do nothing;

with product as (
  insert into products (name, slug, description, price, sku, category_id, status, stock)
  select 'Everyday Hoodie', 'everyday-hoodie', 'Brushed fleece pullover hoodie.', 55.00, 'HOODIE-001', id, 'draft', 20
  from categories where slug = 'hoodies'
  on conflict (slug) do update set name = excluded.name
  returning id
)
insert into product_colors (product_id, name, hex_value, sort_order)
select product.id, c.name, c.hex, c.sort_order
from product, (values ('Heather Grey', '#9CA3AF', 0), ('Forest', '#14532D', 1)) as c(name, hex, sort_order)
on conflict do nothing;
