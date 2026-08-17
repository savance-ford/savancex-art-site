# Printful API setup

This phase adds a server-only connection to Printful's stable REST API. It does
not synchronize products to Supabase and does not replace the local storefront
catalog.

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

## 5. Current storefront status

Printful remains a server-to-server integration. This phase does not write to
Supabase, does not change `CatalogProvider`, and leaves `LocalCatalogProvider`
as the active storefront catalog.
