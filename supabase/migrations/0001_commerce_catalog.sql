create extension if not exists pgcrypto;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  storefront_id text unique not null,
  slug text unique not null,
  name text not null,
  description text,
  summary text,
  category text,
  collection_name text,
  badge text,
  active boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 0,
  printful_sync_product_id bigint unique,
  printful_external_id text,
  printful_thumbnail_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storefront_variant_id text unique not null,
  printful_sync_variant_id bigint unique,
  printful_catalog_variant_id bigint,
  external_id text,
  sku text,
  name text,
  color text,
  color_code text,
  size text,
  retail_price numeric(10,2) not null,
  currency text not null default 'USD',
  availability_status text,
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  image_type text not null default 'gallery',
  sort_order integer not null default 0,
  source text not null default 'storefront',
  created_at timestamptz not null default now()
);

create table public.product_features (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  feature text not null,
  sort_order integer not null default 0
);

create table public.printful_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null,
  products_received integer not null default 0,
  products_upserted integer not null default 0,
  variants_received integer not null default 0,
  variants_upserted integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);

create index product_variants_product_id_idx
  on public.product_variants (product_id);
create index product_variants_printful_catalog_variant_id_idx
  on public.product_variants (printful_catalog_variant_id);
create index product_variants_sku_idx
  on public.product_variants (sku);
create index product_variants_active_idx
  on public.product_variants (active);
create index product_images_product_id_sort_order_idx
  on public.product_images (product_id, sort_order);
create index product_features_product_id_sort_order_idx
  on public.product_features (product_id, sort_order);

-- The unique constraint supplies the index for printful_sync_variant_id.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger set_product_variants_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.product_features enable row level security;
alter table public.printful_sync_runs enable row level security;

revoke all on table public.products from anon, authenticated;
revoke all on table public.product_variants from anon, authenticated;
revoke all on table public.product_images from anon, authenticated;
revoke all on table public.product_features from anon, authenticated;
revoke all on table public.printful_sync_runs from anon, authenticated;

grant select on table public.products to anon, authenticated;
grant select on table public.product_variants to anon, authenticated;
grant select on table public.product_images to anon, authenticated;
grant select on table public.product_features to anon, authenticated;

create policy "Public can read active products"
on public.products
for select
to anon, authenticated
using (active = true);

create policy "Public can read active product variants"
on public.product_variants
for select
to anon, authenticated
using (active = true);

create policy "Public can read product images"
on public.product_images
for select
to anon, authenticated
using (true);

create policy "Public can read product features"
on public.product_features
for select
to anon, authenticated
using (true);

-- printful_sync_runs intentionally has no public policy.
