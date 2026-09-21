alter table public.orders
  add column if not exists stripe_tax_status text,
  add column if not exists stripe_tax_calculation_id text,
  add column if not exists stripe_tax_transaction_id text,
  add column if not exists stripe_tax_collected_at timestamptz;

alter table public.products
  add column if not exists stripe_tax_code text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_stripe_tax_code_format_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_stripe_tax_code_format_check
      check (
        stripe_tax_code is null
        or stripe_tax_code ~ '^txcd_[0-9]{8}$'
      );
  end if;
end
$$;

-- The current SAVANCEX catalog contains general-use apparel. Future products
-- can override or clear this per-product value when their tax category differs.
update public.products
set stripe_tax_code = 'txcd_30011000'
where stripe_tax_code is null;

comment on column public.orders.tax_cents is
  'Customer tax actually charged by Stripe Tax; zero before verified payment.';
comment on column public.orders.total_cents is
  'Pre-payment merchandise plus shipping estimate until replaced by the verified Stripe total.';
comment on column public.products.stripe_tax_code is
  'Optional Stripe product tax code; current apparel is txcd_30011000.';

-- Existing RLS, revoked public privileges, and service_role grants continue to
-- apply to these server-managed columns. No public policies are introduced.
