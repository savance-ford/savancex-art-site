# SAVANCEX storefront

Next.js App Router migration of the existing static storefront. Phase 1 establishes the production framework, typed commerce data, global CSS baseline, public assets, and preserved legacy reference implementation. Storefront sections and interactions are intentionally deferred to later phases.

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
npm run check
```

The development server runs at `http://localhost:3000` by default.

## Reference material

- `reference-static/` contains the preserved legacy SPA, its local server, the old Vercel rewrite, assets, notes, and screenshots.
- `styles.css` remains at the repository root as the visual source of truth.
- `app/globals.css` is the Phase 1 working copy used by Next.js.
- `MIGRATION_INVENTORY.md` documents routes, layout, sections, interactions, state, data dependencies, breakpoints, forms, and future Client Component boundaries.

Do not remove the reference implementation or screenshots until the migration has been visually compared and approved.
