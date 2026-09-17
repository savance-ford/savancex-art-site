# Printful shipping quotes

Shipping is implemented for normalized US destinations in Stripe test mode.
Printful is the authority for both available methods and shipping amounts.

## Flow

1. The checkout form collects full name, email, optional phone, address lines,
   city, a supported US state or territory code, and a five-digit or ZIP+4 postal
   code. Country is fixed to `US`.
2. `POST /api/shipping/quote` accepts only cart variant IDs, quantities, and that
   address. The server reloads products and variants from Supabase and calls
   Printful `POST /shipping/rates` with the catalog variant IDs and quantities.
3. The browser renders only the returned Printful methods. Editing any address
   field invalidates the quote and selected method.
4. `POST /api/stripe/checkout` accepts only the cart, address, and selected
   Printful method ID. It reloads the catalog and obtains a fresh Printful quote.
   A selected method that is no longer returned receives HTTP 409 with
   `shipping_method_unavailable`, prompting the customer to refresh.
5. The server persists the normalized address, authoritative shipping amount,
   method ID and name, delivery estimate, and quote timestamp before creating a
   Stripe Checkout Session. Stripe receives one inline fixed-amount shipping
   option and charges it with the merchandise lines.
6. A verified Stripe webhook marks the order paid without overwriting the stored
   address or contact fields when Stripe omits them. The Printful draft uses the
   same persisted method ID and the immutable order items' sync variant IDs.

Printful rate requests deliberately use `printful_catalog_variant_id` because
the Shipping Rate API expects catalog variants. Printful draft items deliberately
use `printful_sync_variant_id`, which identifies the store's synchronized
fulfillment variant.

## Database

Apply `supabase/migrations/0005_shipping.sql` after the order and Printful
fulfillment migrations. It adds:

- `shipping_method_id` and `shipping_method_name`
- minimum and maximum delivery days
- minimum and maximum delivery dates
- `shipping_rate_quoted_at`

The existing `shipping_cents`, `shipping_address`, customer contact fields, RLS,
and service-role-only table access remain in use.

## Trust boundaries and safeguards

- Browser prices, subtotals, shipping amounts, and totals are rejected. Product
  prices are loaded from Supabase; shipping is loaded directly from Printful.
- Both quote and checkout routes validate cart limits and normalize the full
  address server-side. Address line 1 and line 2 are stored and mapped separately.
- Printful credentials remain server-only. Provider and configuration errors are
  converted to safe client messages, and responses are marked `no-store`.
- Shipping values are converted from decimal strings to integer cents without
  floating-point arithmetic.
- Checkout revalidation prevents a stale or manipulated method ID from reaching
  Stripe. The exact persisted method is later used for the Printful draft.
- Draft creation continues to use
  `POST /orders?update_existing=true`. It does not send `confirm=true` and never
  calls the confirm-order endpoint.
- Stripe live keys are rejected, tax remains zero, and Printful drafts remain
  unconfirmed for manual review.
