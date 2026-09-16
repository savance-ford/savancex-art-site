# Commerce integration plan

The storefront reads its runtime catalog from Supabase through the normalized
catalog boundary. `data/products.ts` remains legacy/reference data and may be
used only by the explicitly configured non-production fallback. Printful is an
upstream synchronization source and is never called during storefront renders.
Stripe checkout, fulfillment orders, and transactional webhooks remain inactive.

## Provider boundaries

- `CatalogProvider` normalizes products, variants, and inventory from whichever
  catalog source is active.
- `CheckoutProvider` will create and retrieve hosted checkout sessions from
  trusted server code.
- `FulfillmentProvider` will estimate shipping, submit paid orders, and retrieve
  fulfillment status from trusted server code.
- `supabaseCatalogProvider` is the active provider. Async catalog helpers compose
  normalized products with their normalized active variants for the existing UI.

Concrete adapters that consume secrets must import `server-only` and live in a
server-only module. Client Components may import shared types, but must never
import a secret-consuming adapter.

## 1. Storefront and Printful IDs

Supabase stores stable storefront-owned product and variant IDs separately from
Printful identifiers. The v2 cart is keyed by `productId::variantId` and retains
both the Printful Sync variant ID and Printful catalog variant ID on each line.
A Printful identifier never implicitly replaces a storefront identifier. The
persisted relationship is:

```text
storefront product ID + selected options
                  -> storefront variant ID
                  -> Printful product/variant ID
```

Cart and order records should retain the storefront identifiers alongside the
provider identifiers so catalog changes do not make historical orders
unreadable.

## 2. Printful catalog entry point

Printful synchronizes upstream data into Supabase. `SupabaseCatalogProvider`
normalizes persisted products and variants into `CommerceProduct` and
`CommerceVariant`; provider-specific database rows stop at that boundary.
Route pages and components never receive raw Printful responses.

## 3. Stripe Checkout Session creation

`POST /api/stripe/checkout` is reserved for Checkout Session creation. A future
Route Handler will validate cart quantities and variant IDs, look up authoritative
prices on the server, call a server-only `CheckoutProvider`, and return only the
minimum redirect data needed by the browser.

The browser must not submit trusted prices, Stripe secret keys, or arbitrary
product metadata. The server will construct those values from the active
catalog provider.

## 4. Stripe webhook handling

`POST /api/stripe/webhook` is reserved for Stripe events. The future handler
will read the raw request body, verify the webhook signature with
`STRIPE_WEBHOOK_SECRET`, and accept only explicitly supported event types.

Successful browser redirection is not proof of payment. Payment state must be
confirmed from a verified webhook before fulfillment begins.

## 5. Submitting a Printful order

After a verified paid Checkout Session event, trusted server code will translate
the purchased storefront variant IDs into Printful variant IDs and call a
server-only `FulfillmentProvider.createOrder`. The resulting Printful order ID
and fulfillment status should be associated with the Stripe session/payment
reference and the storefront order record.

No persistence layer is introduced in this phase. Durable order storage must be
designed before this flow is enabled.

## 6. Why fulfillment cannot run in the browser

Browser-triggered fulfillment would expose privileged credentials and allow a
visitor to alter products, quantities, addresses, or payment claims. It would
also let a browser retry create-order requests outside the verified payment
flow. Printful order creation must therefore occur only after server-side
signature verification and server-side price and variant validation.

## 7. Idempotency and duplicate prevention

The future Stripe webhook flow must derive a stable idempotency key from the
verified Checkout Session or payment identifier. Before creating a Printful
order, the server should atomically record or reserve that key. Replayed events,
concurrent webhook deliveries, and retries must resolve to the already-created
fulfillment order rather than submitting another one.

Both the local order record and the provider request should use idempotency when
the provider supports it. A durable unique constraint is required; an in-memory
set is not sufficient in production.

## 8. Future shipping calculations

`POST /api/printful/shipping` is reserved for server-side shipping estimates. A
future handler can validate the destination and cart, map storefront variants to
Printful variants, and call `FulfillmentProvider.estimateShipping`. Normalized
`ShippingEstimate` records can then be displayed or attached to checkout.

Rates must be revalidated during Checkout Session creation. A browser-supplied
rate or amount must not be treated as authoritative.

## 9. Environment variables

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Browser-safe | Canonical storefront origin and checkout return URLs. |
| `STRIPE_SECRET_KEY` | Server only | Future Stripe API authentication. |
| `STRIPE_WEBHOOK_SECRET` | Server only | Future Stripe webhook signature verification. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Browser-safe | Future Stripe publishable identifier, if a browser integration requires it. |
| `PRINTFUL_TOKEN` | Server only | Future Printful API authentication. |
| `PRINTFUL_STORE_ID` | Server only | Future Printful store selection. |

Only the two intentionally public variables use the `NEXT_PUBLIC_` prefix.
Secrets must never be logged, returned by Route Handlers, or imported into a
Client Component. `.env.example` contains no credentials, and a real
`.env.local` is not created by this phase.

## 10. Remaining placeholder components

- `components/forms/CheckoutForm.tsx` will submit validated cart identifiers to
  the checkout Route Handler and redirect to the hosted session instead of
  displaying an in-memory confirmation.
- `components/cart/CartProvider.tsx`, `CartPageClient.tsx`, and the cart drawer
  already persist and resolve normalized variant IDs. Server checkout must still
  re-resolve every price and identifier before accepting payment.
- `components/product/ProductOptions.tsx` and `ProductPurchasePanel.tsx` select
  active normalized variants and reject unavailable combinations.
- Catalog and product Route Components use async Supabase-backed helpers in
  Server Components.
- `components/forms/TrackingForm.tsx` can retrieve a normalized fulfillment
  status through a server endpoint after durable orders exist.

The four reserved API routes currently return HTTP 501 and must not be presented
as working integrations. `POST /api/printful/webhook` is reserved for verified
fulfillment updates such as shipment and tracking changes.
