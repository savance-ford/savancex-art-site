# Stripe and order foundation

This integration is intentionally limited to Stripe test mode. The server rejects
any `STRIPE_SECRET_KEY` that does not begin with `sk_test_`. Checkout Session
creation, browser redirects, webhook routes, live payments, and Printful order
creation are not enabled in this phase.

## Environment variables

Copy the following names from `.env.example` into the deployment environment and
provide the values through the deployment platform's secret management:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `PRINTFUL_TOKEN`
- `PRINTFUL_STORE_ID`
- `CATALOG_SYNC_SECRET`
- `STRIPE_SECRET_KEY` (server-only and test mode only)
- `STRIPE_WEBHOOK_SECRET` (server-only)

Never expose either Stripe secret through a `NEXT_PUBLIC_` variable, commit it to
source control, or log it. `.env.local` remains ignored by Git.

## Order storage

Migration `0003_orders_and_stripe.sql` creates three server-only tables:

- `orders` stores lifecycle, payment, customer, and aggregate amount fields.
- `order_items` stores immutable purchase-time snapshots of the product name,
  variant, identifiers, price, quantity, and image. Historical orders therefore
  do not depend on mutable catalog data.
- `stripe_webhook_events` will support idempotent webhook processing without
  retaining complete Stripe event payloads.

Row Level Security is enabled on every order table. There are no policies for
`anon` or `authenticated`, and their table privileges are revoked. Only the
server-side Supabase secret client is intended to access these records.

Stripe will be the authority for payment state once webhook handling is added.
Supabase stores the resulting order and item snapshots; it does not independently
declare a payment successful. Printful fulfillment remains disabled.

All authoritative prices must be loaded from the Supabase catalog on the server.
Browser-supplied prices must never be trusted. Postgres numeric price strings are
converted to integer cents with `decimalStringToCents`, which validates the value
and uses integer arithmetic rather than floating-point multiplication.
