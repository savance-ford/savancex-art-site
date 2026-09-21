# Stripe Tax

SAVANCEX uses Stripe Tax for customer-facing sales-tax calculation in Stripe
test mode:

```text
SAVANCEX merchandise prices
  -> Printful live shipping quote
  -> normalized Stripe Customer address
  -> Stripe Checkout Automatic Tax
  -> verified Stripe payment webhook
  -> final Supabase tax and total
  -> unconfirmed Printful draft
```

Apply `supabase/migrations/0006_stripe_tax.sql` after the shipping migration
before enabling tax-enabled Checkout Sessions.

## Checkout configuration

The server creates a Stripe Customer before the Checkout Session. Both the
Customer's general address and shipping address receive the normalized SAVANCEX
address. The Customer ID is persisted immediately and reused when the same
pending order operation is retried. Customer creation and Checkout Session
creation also use order-scoped Stripe idempotency keys.

Checkout receives `automatic_tax.enabled=true`. Merchandise and shipping use
exclusive tax behavior because storefront prices display before sales tax. The
current apparel catalog is configured per product with Stripe's Clothing &
Footwear code, `txcd_30011000`. Dynamic shipping uses Stripe's shipping code,
`txcd_92010001`. Future products can use a different `products.stripe_tax_code`;
when it is null, Stripe's account-level default product tax code applies.

No percentage or jurisdiction rate is stored or calculated by the application.
The Printful shipping amount remains authoritative before tax, while Stripe
decides whether merchandise and shipping are taxable for the customer location.

## Order amounts and verified payment

Before payment, the order contains a non-final estimate:

- `subtotal_cents`: authoritative Supabase merchandise total
- `shipping_cents`: fresh Printful shipping rate
- `tax_cents`: `0`
- `total_cents`: subtotal plus shipping

The verified webhook reads the Checkout Session's `amount_subtotal`,
`total_details.amount_shipping`, `total_details.amount_tax`, `amount_total`, and
`automatic_tax.status`. Automatic Tax must be enabled and complete, discounts
must be zero, and all amounts must reconcile exactly. Only then does the webhook
store Stripe's tax and total, mark the order paid, and create the Printful draft.
A failed or incomplete tax calculation, currency mismatch, or amount mismatch
moves the order to `payment_review` and does not start fulfillment.

The migration includes nullable Stripe tax calculation and transaction ID
columns for future API support. Checkout Session fields in the installed Stripe
SDK do not expose those IDs, so the application does not guess or synthesize
them.

## Registrations and fulfillment tax

Stripe Tax collects only where the Stripe account has an applicable tax
registration. Tax registrations represent the merchant's real legal
obligations: the application does not determine nexus and never creates
registrations automatically. Registrations must be reviewed and configured in
Stripe by the business.

Printful can independently charge tax when SAVANCEX purchases fulfillment. That
tax is a merchant expense and is not `orders.tax_cents`. Customer tax from Stripe
is never sent to Printful, and Printful orders remain unconfirmed drafts.

Live Stripe keys and live Stripe webhook events remain rejected during this
phase.
