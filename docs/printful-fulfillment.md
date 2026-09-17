# Printful draft fulfillment

The fulfillment path is intentionally limited to test-mode payment verification
and draft creation:

```text
verified Stripe webhook
  -> paid Supabase order
  -> Printful draft order
  -> manual inspection
```

**PRINTFUL ORDERS ARE NOT AUTOMATICALLY CONFIRMED.** The integration never calls
the Printful confirmation endpoint and never sends the automatic-confirmation
query parameter. Confirming a draft is a separate future phase and may charge the
configured Printful billing method.

## Preconditions and mapping

The server loads the order and immutable `order_items` from Supabase. It requires
both `orders.status=paid` and `orders.payment_status=paid`, a complete normalized
shipping recipient, at least one item, and a positive
`printful_sync_variant_id` on every item. Browser input is never accepted as
fulfillment data.

The normalized recipient mapping is:

- `shipping_address.name` -> `recipient.name`
- `shipping_address.email` -> `recipient.email`
- `shipping_address.phone` -> `recipient.phone` when present
- `shipping_address.addressLine1` -> `recipient.address1`
- `shipping_address.addressLine2` -> `recipient.address2` when present
- `shipping_address.city` -> `recipient.city`
- `shipping_address.stateCode` -> `recipient.state_code`
- `shipping_address.countryCode` -> `recipient.country_code`
- `shipping_address.postalCode` -> `recipient.zip`

Each Printful item contains the Supabase order-item UUID as `external_id`, the
stored `printful_sync_variant_id` as `sync_variant_id`, and the immutable order
quantity. No custom product, file upload, Stripe credential, or PaymentIntent ID
is sent to Printful.

## Draft request and duplicate protection

The existing server-only Printful client sends:

```text
POST https://api.printful.com/orders?update_existing=true
```

The payload uses the Printful method selected from a live quote and persisted on
the order. A legacy order created before shipping quotes can fall back to
`shipping=STANDARD`; a newly quoted order cannot. Order and order-item external
IDs are their respective lowercase Supabase UUIDs with hyphens removed. Each is
exactly 32 hexadecimal characters, remains stable across retries, and fits
Printful's external-ID limit. The order value is persisted in
`orders.printful_external_id`.

A failed order that still contains the legacy `savancex-{SUPABASE_ORDER_UUID}`
value is migrated to the corrected 32-character value during retry, before the
Printful request. Rows that already have a `printful_order_id` are never changed.

Before the API call, an atomic conditional update claims the order by setting
`fulfillment_status=pending`. A current pending attempt blocks concurrent calls;
a stale attempt can be reclaimed after five minutes. If `printful_order_id` is
already set, the function returns without calling Printful. If Printful creates a
draft but local persistence fails, a retry uses the same external ID and
`update_existing=true` to recover that order instead of creating an independent
duplicate.

Only a response with the expected external ID and `status=draft` is accepted.
Any submitted or otherwise non-draft status is recorded as an operational
failure.

## Supabase state

Apply `supabase/migrations/0004_printful_fulfillment.sql` before enabling the
integration. It adds:

- `printful_status`
- `printful_last_error`
- `printful_last_attempt_at`
- `printful_draft_created_at`

An attempt moves fulfillment to `pending`. A successful draft stores the
Printful order ID and status and moves fulfillment to `draft_created`. A failure
moves only fulfillment to `failed` and stores a safe operational message.
`status=paid` and `payment_status=paid` are never downgraded by Printful errors.
The existing order-table RLS and service-role-only access remain in effect.

## Protected readiness and retry routes

Both endpoints require the existing high-entropy `CATALOG_SYNC_SECRET` as a
Bearer token. They are administrative server routes and are not linked from the
storefront.

Inspect readiness without creating anything:

```powershell
$headers = @{ Authorization = "Bearer $env:CATALOG_SYNC_SECRET" }
Invoke-RestMethod `
  -Method Get `
  -Headers $headers `
  -Uri "http://localhost:3000/api/admin/orders/ORDER_UUID/printful-readiness"
```

Create or retry the draft:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Headers $headers `
  -Uri "http://localhost:3000/api/admin/orders/ORDER_UUID/printful-draft"
```

The retry endpoint returns only a safe summary. It refuses unpaid orders and is
safe to call again after a recorded failure. Inspect the returned draft manually
in Printful; do not submit it for fulfillment during this phase.

## Stripe webhook behavior

After the verified webhook persists a valid paid order, it attempts draft
creation. A Printful configuration, network, provider, validation, or persistence
failure is recorded as a fulfillment failure, logged safely, and swallowed by
the payment handler. Stripe webhook processing can therefore complete while the
paid order remains available for an administrative retry.

The selected Printful rate is revalidated and charged through Stripe before the
order is created. Tax remains zero. Taxes, live payments, and automatic Printful
confirmation remain future work.
