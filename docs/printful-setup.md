# Printful API setup

This integration connects to Printful's stable REST API entirely on the server
and can synchronize its product catalog into Supabase. It does not replace the
local storefront catalog or change the storefront's current read path.

## 1. Create a Printful store

In the Printful dashboard, open **Stores**, choose to create a new store, and
select the **Manual order platform / API** option. Finish the store setup before
creating the API credentials.

## 2. Create a private token

Open the [Printful Developer Portal](https://developers.printful.com/), create a
private token, choose the required store/product read scopes, and securely copy
the token when it is shown. Private tokens expire and must be replaced before
their expiration date.

The application uses Printful's stable REST base URL:
`https://api.printful.com`. It does not use the v2 beta API.

## 3. Configure environment variables

Set these values in `.env.local` for local development and in the deployment
environment for production:

```env
PRINTFUL_TOKEN=
PRINTFUL_STORE_ID=
CATALOG_SYNC_SECRET=
```

`PRINTFUL_TOKEN` is the private token sent to Printful as a Bearer credential.
`PRINTFUL_STORE_ID` selects the store by sending `X-PF-Store-Id`; this is
required for account-level tokens and may be left blank for a store-level token.
`CATALOG_SYNC_SECRET` is a separate, high-entropy secret that protects the
temporary connection-test endpoint.

All three values are server-side configuration. Never prefix them with
`NEXT_PUBLIC_`, commit them, log them, or return them from an API response.

## 4. Test locally

Start the application:

```bash
npm run dev
```

Then call the protected endpoint with the catalog sync secret:

```bash
curl --fail-with-body \
  --header "Authorization: Bearer $CATALOG_SYNC_SECRET" \
  http://localhost:3000/api/admin/printful/connection
```

PowerShell equivalent:

```powershell
$headers = @{ Authorization = "Bearer $env:CATALOG_SYNC_SECRET" }
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/admin/printful/connection" `
  -Headers $headers
```

Missing or incorrect endpoint authorization returns HTTP `401`. A successful
request returns only the connection status, selected store ID/name, and total
sync-product count. Printful credentials, request headers, and raw provider
payloads are never returned.

## 5. Trigger a manual catalog sync

Apply both Supabase migrations before using the synchronization endpoint. The
second migration adds the database-backed synchronization lock and the
transactional catalog-application function.

Trigger a sync with `POST` and the same catalog sync secret:

```bash
curl --fail-with-body \
  --request POST \
  --header "Authorization: Bearer $CATALOG_SYNC_SECRET" \
  http://localhost:3000/api/admin/printful/sync
```

PowerShell equivalent:

```powershell
$headers = @{ Authorization = "Bearer $env:CATALOG_SYNC_SECRET" }
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/admin/printful/sync" `
  -Headers $headers
```

With the application running locally, the repository command provides the same
operation without embedding the secret in the command:

```bash
npm run catalog:sync
```

The command reads `CATALOG_SYNC_SECRET` from `.env.local` when supported by the
installed Node.js version, or from the existing shell environment. Set
`CATALOG_ADMIN_BASE_URL` when the application is not running at
`http://localhost:3000`.

Only one run can have `status = 'running'`. A concurrent request returns HTTP
`409`. Running syncs have a one-hour database lease so a process crash cannot
block synchronization permanently. A run that exceeds the lease cannot apply
its catalog after a replacement run begins.

## 6. Inspect synchronization runs

Open **Table Editor → printful_sync_runs** in Supabase to inspect start and
completion times, status, received/upserted counts, and safe error messages.
The same information can be queried in the SQL Editor:

```sql
select
  id,
  started_at,
  completed_at,
  status,
  products_received,
  products_upserted,
  variants_received,
  variants_upserted,
  error_message
from public.printful_sync_runs
order by started_at desc;
```

Tokens and authorization headers are never written to synchronization rows.

## 7. Current storefront status

Printful remains a server-to-server integration. This phase does not write to
the storefront's read path, does not change `CatalogProvider`, and leaves
`LocalCatalogProvider` as the active storefront catalog. Synchronization writes
only the Supabase commerce tables for later verification and activation.

See `docs/catalog-diagnostics.md` for the protected database-catalog checks.
