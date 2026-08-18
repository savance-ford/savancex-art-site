# SAVANCEX storefront

Next.js App Router storefront backed by the synchronized Supabase commerce
catalog. Runtime product reads are normalized through `CatalogProvider`; the
preserved static implementation and local catalog remain migration and visual
reference material.

## Requirements

- Node.js 20.9 or newer
- npm

## Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm run test:visual
npm run check
```

The development server runs at `http://localhost:3000` by default.

## Reference material

- `reference-static/` contains the preserved legacy SPA, its local server, the old Vercel rewrite, assets, notes, and screenshots.
- `styles.css` remains at the repository root as the visual source of truth.
- `app/globals.css` is the working CSS copy used by Next.js.
- `lib/commerce/supabase-catalog-provider.ts` owns database-to-commerce
  normalization and the five-minute cached runtime snapshot.
- `data/products.ts` is legacy/reference data, not the default runtime catalog.
- `MIGRATION_INVENTORY.md` documents routes, layout, sections, interactions, state, data dependencies, breakpoints, forms, and future Client Component boundaries.

Do not remove the reference implementation or screenshots until the migration has been visually compared and approved.
