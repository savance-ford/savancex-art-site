alter table public.orders
  add column printful_status text,
  add column printful_last_error text,
  add column printful_last_attempt_at timestamptz,
  add column printful_draft_created_at timestamptz;

create index orders_fulfillment_status_idx
  on public.orders (fulfillment_status);

create index orders_pending_fulfillment_attempt_idx
  on public.orders (printful_last_attempt_at)
  where fulfillment_status = 'pending';

comment on column public.orders.printful_status is
  'Last safe Printful order status returned by the Orders API.';
comment on column public.orders.printful_last_error is
  'Safe operational fulfillment error; never credentials or raw API payloads.';
comment on column public.orders.printful_last_attempt_at is
  'Time the most recent Printful draft creation attempt was claimed.';
comment on column public.orders.printful_draft_created_at is
  'Time a verified Printful draft response was persisted.';

-- Existing RLS, revoked public privileges, and service_role grants on orders
-- continue to protect these server-only columns.
