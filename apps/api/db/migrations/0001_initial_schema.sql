-- =============================================================================
-- 0001_initial_schema
--
-- Initial ecommerce schema. Documented in:
--   docs/architecture/database.md
--   docs/features/*/database.md
--
-- Access model: the Node.js API server is the ONLY client of these tables.
-- It connects with DATABASE_URL (a privileged Postgres role that bypasses RLS).
-- RLS is enabled on every table with NO policies, and privileges are revoked
-- from Supabase's `anon` / `authenticated` roles, so the frontends cannot read
-- or write these tables through PostgREST even with a valid Supabase session.
-- See docs/decisions/002-data-access-through-api-only.md.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

create type admin_role as enum ('owner', 'admin', 'staff');
create type product_status as enum ('draft', 'published', 'archived');
create type order_status as enum ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
create type payment_status as enum ('pending', 'paid', 'refunded', 'failed');

-- -----------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- -----------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Admin profiles
--
-- Users live in Supabase Auth (auth.users) and are created manually.
-- A row here is what grants dashboard access; a valid Supabase session alone
-- does not. Deleting the auth user removes the profile.
-- -----------------------------------------------------------------------------

create table admin_profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        admin_role not null default 'staff',
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index admin_profiles_email_key on admin_profiles (lower(email));
create trigger admin_profiles_updated_at before update on admin_profiles
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Categories
-- -----------------------------------------------------------------------------

create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 100),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index categories_active_sort_idx on categories (sort_order, name) where is_active;
create trigger categories_updated_at before update on categories
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Products → colors → images
-- See docs/decisions/001-product-color-image-model.md
-- -----------------------------------------------------------------------------

create table products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (length(name) between 1 and 200),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description       text not null default '',
  price             numeric(12, 2) not null check (price > 0),
  compare_at_price  numeric(12, 2) check (compare_at_price is null or compare_at_price > price),
  sku               text not null unique check (length(sku) between 1 and 100),
  category_id       uuid references categories (id) on delete restrict,
  status            product_status not null default 'draft',
  stock             integer not null default 0 check (stock >= 0),
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index products_category_idx on products (category_id);
create index products_status_updated_idx on products (status, updated_at desc);
create index products_status_price_idx on products (status, price);
create index products_name_trgm_idx on products using gin (name extensions.gin_trgm_ops);
create index products_sku_trgm_idx on products using gin (sku extensions.gin_trgm_ops);
create trigger products_updated_at before update on products
  for each row execute function set_updated_at();

create table product_colors (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products (id) on delete cascade,
  name        text not null check (length(name) between 1 and 50),
  hex_value   text not null check (hex_value ~ '^#([0-9A-F]{3}|[0-9A-F]{6})$'),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index product_colors_product_sort_idx on product_colors (product_id, sort_order);
create unique index product_colors_product_name_key on product_colors (product_id, lower(name));
create trigger product_colors_updated_at before update on product_colors
  for each row execute function set_updated_at();

create table product_images (
  id                uuid primary key default gen_random_uuid(),
  product_color_id  uuid not null references product_colors (id) on delete cascade,
  image_url         text not null,
  imagekit_file_id  text not null unique,
  alt               text,
  sort_order        integer not null default 0,
  is_primary        boolean not null default false,
  created_at        timestamptz not null default now()
);

create index product_images_color_sort_idx on product_images (product_color_id, sort_order);
-- At most one primary image per color.
create unique index product_images_one_primary_per_color
  on product_images (product_color_id) where is_primary;

-- -----------------------------------------------------------------------------
-- ImageKit asset deletion outbox
--
-- When image rows are deleted, the ImageKit file ID is queued here in the SAME
-- transaction. The API then deletes the asset from ImageKit and removes the
-- queue row. Failed deletions stay queued and are retried by the cleanup job.
-- See docs/architecture/image-management.md
-- -----------------------------------------------------------------------------

create table pending_asset_deletions (
  id                uuid primary key default gen_random_uuid(),
  imagekit_file_id  text not null unique,
  attempts          integer not null default 0,
  last_error        text,
  next_attempt_at   timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

create index pending_asset_deletions_due_idx on pending_asset_deletions (next_attempt_at);

-- -----------------------------------------------------------------------------
-- Customers & addresses
-- -----------------------------------------------------------------------------

create table customers (
  id            uuid primary key default gen_random_uuid(),
  -- Reserved for future storefront accounts; guest checkout leaves it null.
  auth_user_id  uuid unique references auth.users (id) on delete set null,
  email         text not null,
  full_name     text not null default '',
  phone         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index customers_email_key on customers (lower(email));
create index customers_created_idx on customers (created_at desc);
create index customers_name_trgm_idx on customers using gin (full_name extensions.gin_trgm_ops);
create index customers_email_trgm_idx on customers using gin (email extensions.gin_trgm_ops);
create trigger customers_updated_at before update on customers
  for each row execute function set_updated_at();

create table addresses (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references customers (id) on delete cascade,
  line1        text not null,
  line2        text,
  city         text not null,
  state        text not null default '',
  postal_code  text not null,
  country      text not null check (country ~ '^[A-Z]{2}$'),
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index addresses_customer_idx on addresses (customer_id);
create trigger addresses_updated_at before update on addresses
  for each row execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- Orders
--
-- Orders snapshot everything needed to render them later (customer contact,
-- shipping address, product name/sku/color/price). They never depend on the
-- current product row. See docs/decisions/003-order-snapshots.md
-- -----------------------------------------------------------------------------

create sequence order_number_seq start 1001;

create table orders (
  id                     uuid primary key default gen_random_uuid(),
  order_number           text not null unique
                           default ('ORD-' || lpad(nextval('order_number_seq')::text, 6, '0')),
  customer_id            uuid references customers (id) on delete set null,
  customer_email         text not null,
  customer_name          text not null,
  customer_phone         text,
  shipping_line1         text not null,
  shipping_line2         text,
  shipping_city          text not null,
  shipping_state         text not null default '',
  shipping_postal_code   text not null,
  shipping_country       text not null,
  status                 order_status not null default 'pending',
  payment_status         payment_status not null default 'pending',
  currency               text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  subtotal               numeric(12, 2) not null check (subtotal >= 0),
  shipping_cost          numeric(12, 2) not null default 0 check (shipping_cost >= 0),
  total                  numeric(12, 2) not null check (total >= 0),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index orders_created_idx on orders (created_at desc);
create index orders_status_created_idx on orders (status, created_at desc);
create index orders_payment_status_idx on orders (payment_status);
create index orders_customer_idx on orders (customer_id, created_at desc);
create index orders_email_trgm_idx on orders using gin (customer_email extensions.gin_trgm_ops);
create index orders_name_trgm_idx on orders using gin (customer_name extensions.gin_trgm_ops);
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

create table order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders (id) on delete cascade,
  -- Links to the live catalog are informational only and may become null.
  product_id        uuid references products (id) on delete set null,
  product_color_id  uuid references product_colors (id) on delete set null,
  -- Purchase-time snapshot:
  product_name      text not null,
  product_sku       text not null,
  color_name        text,
  color_hex         text,
  image_url         text,
  unit_price        numeric(12, 2) not null check (unit_price >= 0),
  quantity          integer not null check (quantity > 0),
  line_total        numeric(12, 2) not null check (line_total >= 0),
  created_at        timestamptz not null default now()
);

create index order_items_order_idx on order_items (order_id);
create index order_items_product_idx on order_items (product_id);

create table order_status_history (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders (id) on delete cascade,
  from_status  order_status,
  to_status    order_status not null,
  changed_by   uuid references admin_profiles (id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);

create index order_status_history_order_idx on order_status_history (order_id, created_at);

-- -----------------------------------------------------------------------------
-- Lock the tables down: API server only.
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'admin_profiles', 'categories', 'products', 'product_colors', 'product_images',
    'pending_asset_deletions', 'customers', 'addresses', 'orders', 'order_items',
    'order_status_history'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on table public.%I from anon', t);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on table public.%I from authenticated', t);
    end if;
  end loop;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke usage on sequence public.order_number_seq from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke usage on sequence public.order_number_seq from authenticated;
  end if;
end;
$$;
