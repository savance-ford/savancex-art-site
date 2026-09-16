# Supabase database setup

This phase adds the SAVANCEX commerce schema and typed Supabase clients. The
storefront still reads from the existing local catalog; no rendering or cart
behavior is connected to Supabase yet.

## 1. Create the project

1. Sign in to the Supabase dashboard and create a new project.
2. Choose the organization, project name, database password, and region.
3. Wait for the database to finish provisioning.

## 2. Configure environment variables

Copy the following values from the project's API settings into the matching
environment variables in the local or deployment environment:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

The project URL and publishable key support browser-safe, Row Level Security
(RLS)-controlled reads. `SUPABASE_SECRET_KEY` has administrative access and is
server-only. Never prefix it with `NEXT_PUBLIC_`, expose it through an API,
import the administrative client into a Client Component, log it, or commit it.

For local development, put real values in `.env.local`. That file already
matches the repository's `.env*` ignore rule and must remain uncommitted.

## 3. Apply the migration

Open the Supabase SQL Editor, create a new query, paste the contents of
`supabase/migrations/0001_commerce_catalog.sql`, and run it once. Alternatively,
if the project is linked with the Supabase CLI, apply checked-in migrations with
`supabase db push`.

The migration creates:

- `products`
- `product_variants`
- `product_images`
- `product_features`
- `printful_sync_runs`

It also creates indexes, foreign keys with cascading child deletion, and an
`updated_at` trigger for `products` and `product_variants`.

## 4. Row Level Security behavior

RLS is enabled on all five tables. Browser/public reads can return only active
products and active variants. Product images and product features are publicly
readable. No browser/public role can insert, update, or delete commerce data.
`printful_sync_runs` has no public read policy.

Future administrative synchronization will use the server-only secret key. Do
not store the Printful token or any other credential in a table's `metadata`
column.

## 5. Current catalog status

Applying this migration does not activate the database catalog. The existing
`LocalCatalogProvider` and `data/products.ts` remain the storefront's active
catalog until a later integration phase explicitly switches providers.
