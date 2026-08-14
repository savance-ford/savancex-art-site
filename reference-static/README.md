# NOCTRA Storefront — Reference-Aligned Rebuild

A dependency-free storefront prototype rebuilt around the public UX patterns of the supplied fashion-store reference: a bright product-led layout, compact navigation, full-bleed hero, shipping marquee, dense collection grids, review proof, editorial brand story, community gallery, persistent cart, search, product options, and support pages.

The visual identity, logo, product mockups, copy, and photography in this package are original or licensed placeholders. No reference-store branding, product photography, or proprietary artwork is included.

## Run locally

1. Extract the ZIP so `package.json` is directly inside the project folder.
2. Open PowerShell or Terminal in that folder.
3. Run:

```bash
npm run dev
```

4. Open:

```text
http://localhost:4173
```

There are no external packages and no `npm install` step.

## Key routes

- `/` — Homepage
- `/shop` — Full catalog
- `/shop/t-shirts`
- `/shop/hoodies`
- `/shop/crewnecks`
- `/collections/after-hours`
- `/collections/static-bloom`
- `/collections/archive-01`
- `/products/signal-loss`
- `/reviews`
- `/about`
- `/contact`
- `/track-order`
- `/size-guide`
- `/wash-guide`
- `/shipping`
- `/account`
- `/cart`
- `/checkout` — Non-transactional demo

## Functional behavior

- Responsive desktop and mobile navigation
- Shop mega-menu and mobile drawer
- Search overlay and results
- Category filtering, sorting, and availability filters
- Product image hover swap
- Color and size selection
- Quick add and product-page Add to Bag
- Persistent `localStorage` cart
- Cart drawer and full cart page
- Quantity changes, removal, subtotal, and free-shipping progress
- Placeholder account, order tracking, newsletter, contact, and checkout flows
- SPA route fallback for local hosting and Vercel

## Preview files

- `PREVIEW_HOME_DESKTOP.png`
- `PREVIEW_HOME_MOBILE.png`
- `PREVIEW_SHOP.png`
- `PREVIEW_PRODUCT.png`

## Validation

```bash
npm run check
```

This validates the JavaScript syntax for the app, product data, and local server.
