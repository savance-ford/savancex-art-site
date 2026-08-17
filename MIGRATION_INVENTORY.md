# Static storefront migration inventory

This inventory records the behavior and visual structure of the legacy SPA before any storefront sections are ported to Next.js. The immutable comparison copy lives in `reference-static/`.

## 1. Routes

The legacy router normalizes trailing slashes and renders these paths:

- `/`
- `/shop`
- `/shop/t-shirts`
- `/shop/hoodies`
- `/shop/crewnecks`
- `/collections/after-hours`
- `/collections/static-bloom`
- `/collections/archive-01`
- `/products/[slug]` for the 12 product slugs in `data.js`
- `/reviews`
- `/about`
- `/contact`
- `/track-order`
- `/size-guide`
- `/wash-guide`
- `/shipping`
- `/account`
- `/cart`
- `/checkout`
- `/search`, with the search term in the `q` query parameter

Unknown routes render the storefront's custom “Signal lost” state. Internal links use History API navigation and `popstate`; the old Vercel rewrite sent all non-asset paths to `index.html`.

## 2. Global layout elements

- Fixed-accessibility skip link.
- Thin black utility bar with shipping copy and support links; hidden at mobile widths.
- White sticky main header with desktop navigation, centered wordmark, search, account, and cart controls.
- Desktop Shop mega-menu.
- Main content region.
- Per-page orange free-shipping announcement marquee. The homepage places it after the hero; most routes place it before page content.
- Orange newsletter block.
- White multi-column footer with brand, country selector, social links, legal links, and copyright.
- Shared overlay root, backdrop, body scroll lock, and toast region.
- Checkout is the exception: it renders a dedicated two-column checkout shell without the normal header, newsletter, or footer.

## 3. Homepage sections, in source order

1. Full-bleed campaign hero with centered Shop now CTA.
2. Free-shipping announcement marquee.
3. Featured collection heading, six-product three-column grid, and Shop all CTA.
4. Customer-review ticker.
5. Final capsule restock heading and six-product three-column grid.
6. Review proof panel with review link, 4.9/5 statistic, and 99% recommendation statistic.
7. Core “The GOAT” heading and complete four-column product catalog.
8. Two-column brand story image and copy.
9. Community heading and six-image social grid.
10. Newsletter signup.
11. Multi-column footer.

## 4. Interactive features

- History API route interception, back/forward handling, title updates, and scroll reset.
- Desktop mega-menu toggle.
- Mobile navigation drawer.
- Search overlay with live client-side product matching and link to `/search?q=`.
- Catalog category links, product-count update, filter controls, reset, and four sort modes.
- CSS product-image hover swap and hover-revealed Quick add; Quick add is always visible on smaller screens.
- Product color and size selection.
- Product Add to bag action.
- Product information accordions.
- Cart add, increment, decrement, remove, count, subtotal, and free-shipping progress.
- Cart drawer refresh and full cart/checkout route refresh after mutations.
- Toast success/status messages.
- Escape-key overlay dismissal and body scroll locking.
- CSS marquees, hover transitions, and reduced-motion overrides.

## 5. Overlays and drawers

- Right-side cart drawer over a backdrop.
- Full-screen search overlay.
- Right-side product-filter drawer over a backdrop.
- Full-screen mobile navigation drawer.
- Bottom-center transient toast layer.
- Desktop Shop mega-menu is a fixed dropdown layer but does not use the shared overlay root.

## 6. localStorage dependencies

The only persistent browser dependency is `localStorage["noctra-cart"]`. It stores a JSON array of cart lines shaped as `{ productId, color, size, qty }`. Reads are guarded against invalid JSON; writes occur after every cart mutation. Sort, filters, selected product options, search terms, mega-menu state, and active overlays are memory-only.

## 7. Product-data dependencies

- `brand.shippingThreshold` drives cart progress and shipping labels. `brand.name` and `brand.tagline` are present but not read by the legacy renderer.
- `products` drives homepage grids, catalog/category filtering, collection membership, product detail routes, related-product rails, search, review/price/card metadata, sold-out state, cart lines, and checkout summaries.
- Product identity relies on both `id` (cart/actions) and `slug` (routing).
- Product option UI relies on `colors` and `sizes`; galleries use `image` and `altImage`; detail content uses `summary`, `features`, and `fit`.
- `collections` drives the three collection routes, banner copy, editorial images, and collection product filtering by collection name.
- `reviews` drives the review-card list. Aggregate 4.9/5, 1,250+, and 99% values are hard-coded in markup rather than computed.
- Current dataset totals: one brand record, 12 products, three collections, and six reviews.

## 8. Responsive breakpoints

- Base desktop styles above 1100px.
- `max-width: 1100px`: reduces navigation density; changes product grids and product layout; adjusts proof, trust, and footer grids.
- `max-width: 820px`: hides the utility bar and desktop navigation; enables mobile menu/search/cart controls; changes the header to 61px in the final override; makes Quick add persistent; collapses major two-column layouts; changes reference product grids to two columns.
- `max-width: 560px`: tightens typography and spacing; keeps two-column product catalogs; converts the product gallery to a horizontal snap rail; stacks proof, newsletter, forms, footer, cart, and checkout details.
- `prefers-reduced-motion: reduce`: effectively disables animations, transitions, and smooth scrolling.
- The supplied comparisons are 1440×9345 (home desktop), 390×9547 (home mobile), 1440×1000 (shop), and 1440×1000 (product).

## 9. Forms

- Newsletter email signup (`data-form="newsletter"`), replaced in place with a prototype success state.
- Contact form (`data-form="contact"`), replaced in place with a prototype success state.
- Order tracking form (`data-form="tracking"`), which inserts a sample in-transit result.
- Account login form (`data-form="account"`), which only displays a toast.
- Search results form (`data-form="search-page"`), which navigates to `/search?q=`.
- Search overlay form (`data-form="search-overlay"`), which supports live results and submission to `/search?q=`.
- Checkout contains contact/address/select inputs and a demo-order button, but the legacy markup does not wrap those fields in a semantic `<form>` and sends no data.
- The Create account control is a non-submit button with a toast-only placeholder action.

No legacy form sends a network request.

## 10. Features requiring Client Components

- Shared cart provider: localStorage hydration, cart mutations, totals, shipping progress, and cart count.
- Header interaction: mega-menu state, overlay launchers, mobile navigation, and Escape handling.
- Cart, search, mobile navigation, filter, and toast overlay components, including body scroll lock and focus behavior.
- Catalog controls: filter state, sort state, filtered product count, and filter drawer integration.
- Quick add controls embedded in otherwise server-renderable product cards.
- Product option selector, Add to bag control, and accordion controls.
- Cart route and checkout summary because their output depends on hydrated cart state.
- Newsletter, contact, tracking, account, search, and demo checkout form behaviors.

Page layouts, static content, product-card structure, collection lookup, product lookup, and initial catalog data can remain React Server Components.

## Asset inventory

The source contains 41 assets: 24 product SVGs (front/back pairs for 12 products), six community SVGs, three editorial SVGs, four editorial JPGs, the JPG hero, a legacy SVG hero, the SVG logo, and the SVG favicon. The JPG dimensions and every SVG viewBox were audited before copying the tree unchanged to `public/assets/`.
