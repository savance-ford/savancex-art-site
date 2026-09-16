create unique index printful_sync_runs_one_running_idx
  on public.printful_sync_runs (status)
  where status = 'running';

create unique index product_images_one_printful_thumbnail_idx
  on public.product_images (product_id)
  where source = 'printful' and image_type = 'thumbnail';

create or replace function public.begin_printful_catalog_sync()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  sync_run_id uuid;
begin
  update public.printful_sync_runs
  set
    status = 'failed',
    completed_at = now(),
    error_message = 'Synchronization lease expired before completion.'
  where
    status = 'running'
    and started_at < now() - interval '1 hour';

  insert into public.printful_sync_runs (status)
  values ('running')
  returning id into sync_run_id;

  return sync_run_id;
exception
  when unique_violation then
    raise exception using
      errcode = 'P0001',
      message = 'printful_sync_already_running';
end;
$$;

create or replace function public.apply_printful_catalog_sync(
  p_sync_run_id uuid,
  p_products jsonb,
  p_variants jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_run_status text;
  products_upserted_count integer := 0;
  variants_upserted_count integer := 0;
begin
  if jsonb_typeof(p_products) is distinct from 'array' then
    raise exception 'printful_sync_products_must_be_an_array';
  end if;

  if jsonb_typeof(p_variants) is distinct from 'array' then
    raise exception 'printful_sync_variants_must_be_an_array';
  end if;

  select status
  into current_run_status
  from public.printful_sync_runs
  where id = p_sync_run_id
  for update;

  if current_run_status is null then
    raise exception 'printful_sync_run_not_found';
  end if;

  if current_run_status <> 'running' then
    raise exception 'printful_sync_run_not_running';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_products) as incoming(
      printful_sync_product_id bigint,
      storefront_id text,
      slug text,
      name text,
      printful_external_id text,
      printful_thumbnail_url text,
      active boolean
    )
    where
      incoming.printful_sync_product_id is null
      or incoming.storefront_id is null
      or incoming.slug is null
      or incoming.name is null
      or incoming.active is null
  ) then
    raise exception 'printful_sync_product_payload_invalid';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_variants) as incoming(
      printful_sync_variant_id bigint,
      printful_sync_product_id bigint,
      storefront_variant_id text,
      printful_catalog_variant_id bigint,
      external_id text,
      sku text,
      name text,
      color text,
      size text,
      retail_price numeric(10,2),
      currency text,
      availability_status text,
      active boolean,
      metadata jsonb
    )
    where
      incoming.printful_sync_variant_id is null
      or incoming.printful_sync_product_id is null
      or incoming.storefront_variant_id is null
      or incoming.printful_catalog_variant_id is null
      or incoming.name is null
      or incoming.retail_price is null
      or incoming.currency is null
      or incoming.active is null
  ) then
    raise exception 'printful_sync_variant_payload_invalid';
  end if;

  insert into public.products (
    storefront_id,
    slug,
    name,
    active,
    printful_sync_product_id,
    printful_external_id,
    printful_thumbnail_url
  )
  select
    incoming.storefront_id,
    incoming.slug,
    incoming.name,
    incoming.active,
    incoming.printful_sync_product_id,
    incoming.printful_external_id,
    incoming.printful_thumbnail_url
  from jsonb_to_recordset(p_products) as incoming(
    printful_sync_product_id bigint,
    storefront_id text,
    slug text,
    name text,
    printful_external_id text,
    printful_thumbnail_url text,
    active boolean
  )
  on conflict (printful_sync_product_id) do update
  set
    name = excluded.name,
    active = excluded.active,
    printful_external_id = excluded.printful_external_id,
    printful_thumbnail_url = excluded.printful_thumbnail_url,
    updated_at = now();

  get diagnostics products_upserted_count = row_count;

  insert into public.product_variants (
    product_id,
    storefront_variant_id,
    printful_sync_variant_id,
    printful_catalog_variant_id,
    external_id,
    sku,
    name,
    color,
    size,
    retail_price,
    currency,
    availability_status,
    active,
    metadata
  )
  select
    product.id,
    incoming.storefront_variant_id,
    incoming.printful_sync_variant_id,
    incoming.printful_catalog_variant_id,
    incoming.external_id,
    incoming.sku,
    incoming.name,
    incoming.color,
    incoming.size,
    incoming.retail_price,
    incoming.currency,
    incoming.availability_status,
    incoming.active,
    coalesce(incoming.metadata, '{}'::jsonb)
  from jsonb_to_recordset(p_variants) as incoming(
    printful_sync_variant_id bigint,
    printful_sync_product_id bigint,
    storefront_variant_id text,
    printful_catalog_variant_id bigint,
    external_id text,
    sku text,
    name text,
    color text,
    size text,
    retail_price numeric(10,2),
    currency text,
    availability_status text,
    active boolean,
    metadata jsonb
  )
  join public.products as product
    on product.printful_sync_product_id = incoming.printful_sync_product_id
  on conflict (printful_sync_variant_id) do update
  set
    product_id = excluded.product_id,
    printful_catalog_variant_id = excluded.printful_catalog_variant_id,
    external_id = excluded.external_id,
    sku = excluded.sku,
    name = excluded.name,
    color = excluded.color,
    size = excluded.size,
    retail_price = excluded.retail_price,
    currency = excluded.currency,
    availability_status = excluded.availability_status,
    active = excluded.active,
    metadata = excluded.metadata,
    updated_at = now();

  get diagnostics variants_upserted_count = row_count;

  delete from public.product_images as image
  using public.products as product
  where
    image.product_id = product.id
    and image.source = 'printful'
    and image.image_type = 'thumbnail'
    and exists (
      select 1
      from jsonb_to_recordset(p_products) as incoming(
        printful_sync_product_id bigint,
        printful_thumbnail_url text
      )
      where
        incoming.printful_sync_product_id = product.printful_sync_product_id
        and incoming.printful_thumbnail_url is null
    );

  insert into public.product_images (
    product_id,
    url,
    alt_text,
    image_type,
    source
  )
  select
    product.id,
    incoming.printful_thumbnail_url,
    incoming.name || ' thumbnail',
    'thumbnail',
    'printful'
  from jsonb_to_recordset(p_products) as incoming(
    printful_sync_product_id bigint,
    printful_thumbnail_url text,
    name text
  )
  join public.products as product
    on product.printful_sync_product_id = incoming.printful_sync_product_id
  where incoming.printful_thumbnail_url is not null
  on conflict (product_id)
    where source = 'printful' and image_type = 'thumbnail'
  do update
  set
    url = excluded.url,
    alt_text = excluded.alt_text;

  update public.product_variants as variant
  set
    active = false,
    updated_at = now()
  where
    variant.printful_sync_variant_id is not null
    and variant.active is distinct from false
    and not exists (
      select 1
      from jsonb_to_recordset(p_variants) as incoming(
        printful_sync_variant_id bigint
      )
      where incoming.printful_sync_variant_id = variant.printful_sync_variant_id
    );

  update public.products as product
  set
    active = false,
    updated_at = now()
  where
    product.printful_sync_product_id is not null
    and product.active is distinct from false
    and not exists (
      select 1
      from jsonb_to_recordset(p_products) as incoming(
        printful_sync_product_id bigint
      )
      where incoming.printful_sync_product_id = product.printful_sync_product_id
    );

  update public.printful_sync_runs
  set
    status = 'completed',
    completed_at = now(),
    products_received = jsonb_array_length(p_products),
    products_upserted = products_upserted_count,
    variants_received = jsonb_array_length(p_variants),
    variants_upserted = variants_upserted_count,
    error_message = null
  where id = p_sync_run_id;

  return jsonb_build_object(
    'products_upserted', products_upserted_count,
    'variants_upserted', variants_upserted_count
  );
end;
$$;

revoke all on function public.begin_printful_catalog_sync()
  from public, anon, authenticated;
revoke all on function public.apply_printful_catalog_sync(uuid, jsonb, jsonb)
  from public, anon, authenticated;

grant execute on function public.begin_printful_catalog_sync()
  to service_role;
grant execute on function public.apply_printful_catalog_sync(uuid, jsonb, jsonb)
  to service_role;
