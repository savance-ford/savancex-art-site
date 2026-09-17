alter table public.orders
  add column shipping_method_id text,
  add column shipping_method_name text,
  add column shipping_min_delivery_days integer
    check (shipping_min_delivery_days is null or shipping_min_delivery_days > 0),
  add column shipping_max_delivery_days integer
    check (shipping_max_delivery_days is null or shipping_max_delivery_days > 0),
  add column shipping_min_delivery_date date,
  add column shipping_max_delivery_date date,
  add column shipping_rate_quoted_at timestamptz;

alter table public.orders
  add constraint orders_shipping_delivery_days_ordered_check
  check (
    shipping_min_delivery_days is null
    or shipping_max_delivery_days is null
    or shipping_min_delivery_days <= shipping_max_delivery_days
  ),
  add constraint orders_shipping_delivery_dates_ordered_check
  check (
    shipping_min_delivery_date is null
    or shipping_max_delivery_date is null
    or shipping_min_delivery_date <= shipping_max_delivery_date
  );

-- Existing orders RLS, revoked public privileges, and service_role grants apply
-- to these server-managed columns without introducing a separate shipping table.
