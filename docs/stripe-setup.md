# Stripe and order foundation

This integration is intentionally limited to Stripe test mode. The server rejects
any `STRIPE_SECRET_KEY` that does not begin with `sk_test_`. Hosted Checkout
Session creation and browser redirects are enabled. Webhook payment processing,
verified paid-order persistence, paid-only cart clearing, and Printful draft
creation are enabled. Live payments and automatic Printful confirmation are not
enabled in this phase.

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
- `CHECKOUT_ALLOWED_COUNTRIES` (legacy configuration; checkout currently accepts
  normalized US addresses only)

Never expose either Stripe secret through a `NEXT_PUBLIC_` variable, commit it to
source control, or log it. `.env.local` remains ignored by Git.

## Order storage

Migration `0003_orders_and_stripe.sql` creates three server-only tables:

- `orders` stores lifecycle, payment, customer, and aggregate amount fields.
- `order_items` stores immutable purchase-time snapshots of the product name,
  variant, identifiers, price, quantity, and image. Historical orders therefore
  do not depend on mutable catalog data.
- `stripe_webhook_events` supports idempotent webhook processing without
  retaining complete Stripe event payloads.

Apply this migration to the target Supabase project before enabling the Checkout
route. Session creation intentionally stops if the order snapshot cannot be
persisted first.

Row Level Security is enabled on every order table. There are no policies for
`anon` or `authenticated`, and their table privileges are revoked. Only the
server-side Supabase secret client is intended to access these records.

Stripe webhooks are the authority for payment state. Supabase stores the resulting
order and item snapshots; reaching the browser success URL never independently
declares a payment successful. Only verified paid orders can create Printful
drafts, which remain unconfirmed for manual inspection.

All authoritative prices must be loaded from the Supabase catalog on the server.
Browser-supplied prices must never be trusted. Postgres numeric price strings are
converted to integer cents with `decimalStringToCents`, which validates the value
and uses integer arithmetic rather than floating-point multiplication.

## Hosted Checkout flow

The browser first submits storefront variant IDs, quantities, and a normalized
US address to `/api/shipping/quote`. The server resolves the active catalog rows
and asks Printful for live shipping methods using each item's catalog variant
ID. At checkout, the browser sends only those cart identifiers, the address, and
the selected method ID. It never supplies a product price, shipping price, or
order total.

The Checkout route resolves the catalog again and obtains a fresh Printful quote
for the same address and cart. It requires an exact selected-method match, uses
the newly quoted amount as the authoritative shipping charge, and rejects a
method that disappeared. It then creates the pending order and immutable item
snapshots before requesting a Stripe Checkout Session.

Sessions use inline product `price_data`, one inline fixed-amount shipping rate,
`mode=payment`, the Supabase order UUID as the client reference, an order-derived
idempotency key, and minimal order identifier metadata. The address is collected
and normalized by the storefront before redirecting to Stripe; Stripe does not
collect a second shipping address. The authoritative Printful shipping amount is
charged. Stripe Automatic Tax then calculates customer tax using the persisted
Stripe Customer address.
If Stripe Session creation fails after persistence, the order remains accurately
unpaid and `checkout_pending`; it is never marked paid by the request route.

Do not enable live Stripe keys until Stripe Tax registrations and production tax
behavior have been reviewed. The server-side Stripe client keeps rejecting live
secret keys during this phase. See `docs/tax.md`.

## Webhook processing

`POST /api/stripe/webhook` verifies the exact raw request body with the
`stripe-signature` header before processing anything. It supports:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

Every verified event is claimed through the unique `stripe_event_id` in
`stripe_webhook_events`. Completed deliveries return without repeating order
updates; concurrent processing receives a retryable response; failed deliveries
can be reclaimed. Unsupported and live-mode events are recorded as ignored.

Before an order becomes paid, the handler requires matching Session/order
identifiers, a successful Stripe payment status, the expected currency, and the
exact expected total. Currency or amount mismatches move the order to
`payment_review`. They never mark it paid and never start fulfillment.

The success page reads the Session and Supabase order but does not update payment
state. It shows a processing state until the webhook has persisted `paid`. Its
small client helper clears the local cart only when the server-rendered order is
confirmed paid.

## Windows local webhook testing

Install Stripe CLI using an official Windows method from the
[Stripe CLI installation guide](https://docs.stripe.com/stripe-cli). The official
Stripe Scoop bucket is one supported option:

```powershell
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
stripe login
```

Start the application in one PowerShell terminal:

```powershell
npm run dev
```

In another PowerShell terminal, forward test events:

```powershell
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

The CLI prints a signing secret resembling `whsec_...`. Put that local CLI
secret in `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

This secret is only for that local Stripe CLI forwarding endpoint. Restart
`npm run dev` after changing `.env.local`.

### End-to-end test

Before testing, apply `supabase/migrations/0003_orders_and_stripe.sql` to the
configured test Supabase project.

1. Start Next.js with `npm run dev`.
2. Start `stripe listen --forward-to http://localhost:3000/api/stripe/webhook`.
3. Add a real synchronized Supabase/Printful variant to the cart.
4. Click checkout.
5. Confirm that the Stripe-hosted page is in test mode.
6. Enter card `4242 4242 4242 4242`, any future expiration date, any valid
   three-digit CVC.
7. Complete Checkout.
8. Confirm Stripe CLI receives `checkout.session.completed`.
9. Confirm the webhook returns HTTP 200.
10. Confirm the Supabase order has `status=paid` and `payment_status=paid`.
11. Confirm exactly one matching `stripe_webhook_events` row exists.
12. Confirm `/checkout/success` shows the order number, paid state, and total.
13. Confirm the browser cart clears only after the verified paid state appears.
14. Confirm exactly one Printful order draft was created and was not submitted
    for fulfillment.

Run `npm run orders:check` to inspect recent order states, webhook failures,
duplicate event IDs, and payment-review orders without printing secrets.

## Vercel test-mode preparation

Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` as server-only Vercel
environment variables. Register the deployed `/api/stripe/webhook` URL as a
separate Stripe test-mode webhook endpoint and use the signing secret Stripe
issues for that deployed endpoint.

Do not copy the local Stripe CLI `whsec_...` value to Vercel. Do not register or
enable live-mode webhooks yet.
