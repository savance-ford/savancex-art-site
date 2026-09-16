# Catalog diagnostics

Catalog diagnostics are read-only administrative checks against the Supabase
commerce tables. They do not write catalog data or invalidate the storefront's
cached normalized catalog.

## Protected endpoint

The endpoint is:

```text
GET /api/admin/catalog/diagnostics
```

It requires the same server-side administrative secret used by catalog sync:

```http
Authorization: Bearer <CATALOG_SYNC_SECRET>
```

Missing and incorrect credentials return HTTP `401`. The response contains
counts, minimal product/variant identifiers for detected issues, and safe sync
statistics. It never includes environment values, database credentials, sync
metadata, or stored provider payloads.

## Run the readable check

Start the application in one terminal:

```bash
npm run dev
```

Run diagnostics in another terminal:

```bash
npm run catalog:check
```

The command loads `CATALOG_SYNC_SECRET` from `.env.local` when the installed
Node.js runtime supports `process.loadEnvFile`. Otherwise, export the variable
in the shell before running the command. Credentials are used only for the
authorization header and are never printed.

The script targets `http://localhost:3000` by default. To check another running
deployment, provide its origin without a path:

```powershell
$env:CATALOG_ADMIN_BASE_URL = "https://your-deployment.example"
npm run catalog:check
```

## Checks returned

The diagnostic report includes:

- Total and active product counts
- Total and active variant counts
- Products with no variants
- Products and variants without Printful IDs
- Products with no images
- Duplicate slugs
- Variants without valid prices
- Variants missing size or color values
- The most recent Printful sync summary
- The last successful Printful sync time

Table reads are paginated so the report is not limited to Supabase's first
result page.

## Trigger synchronization from npm

The optional synchronization command uses the same protected server endpoint:

```bash
npm run catalog:sync
```

This command mutates the database. Apply all Supabase migrations and verify the
Printful/Supabase credentials before using it. Neither npm command embeds a
credential in `package.json`.

## Storefront status

`SupabaseCatalogProvider` is the active runtime provider. The local provider is
retained only for the explicit non-production
`COMMERCE_CATALOG_FALLBACK=local` fallback and migration/reference work.
