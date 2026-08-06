(() => {
  "use strict";

  const DATA = window.STORE_DATA;
  const app = document.getElementById("app");
  const overlayRoot = document.getElementById("overlay-root");
  const toastRoot = document.getElementById("toast-root");

  const state = {
    cart: loadCart(),
    sort: "featured",
    filters: { categories: [], availableOnly: false, under50: false },
    megaOpen: false,
    activeOverlay: null,
    searchQuery: ""
  };

  function loadCart() {
    try {
      const saved = JSON.parse(localStorage.getItem("noctra-cart") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem("noctra-cart", JSON.stringify(state.cart));
    updateCartBadges();
  }

  function money(value) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  }

  function cartCount() {
    return state.cart.reduce((sum, line) => sum + line.qty, 0);
  }

  function cartSubtotal() {
    return state.cart.reduce((sum, line) => {
      const product = DATA.products.find((item) => item.id === line.productId);
      return sum + (product ? product.price * line.qty : 0);
    }, 0);
  }

  function lineKey(line) {
    return `${line.productId}::${line.color}::${line.size}`;
  }

  function icon(name) {
    const icons = {
      search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
      user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.8-4.2 3.4-6.5 7.5-6.5s6.7 2.3 7.5 6.5"/></svg>',
      bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
      menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
      close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m5 5 14 14M19 5 5 19"/></svg>',
      arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14M14 7l5 5-5 5"/></svg>',
      plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>',
      minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14"/></svg>',
      chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m7 10 5 5 5-5"/></svg>'
    };
    return icons[name] || "";
  }

  function routeLink(path, label, className = "") {
    return `<a href="${path}" data-route class="${className}">${label}</a>`;
  }

  function announcement() {
    const phrase = "🚀 FREE SHIPPING OVER $75 📦";
    const group = new Array(8).fill(`<span>${phrase}</span>`).join("");
    return `<div class="announcement" aria-label="Store announcement"><div class="marquee"><div class="marquee__group">${group}</div><div class="marquee__group" aria-hidden="true">${group}</div></div></div>`;
  }

  function header() {
    return `
      <div class="utility-bar">
        <div class="utility-bar__inner utility-bar__inner--reference">
          <span>Free U.S. shipping on orders over $75</span>
          <div class="utility-links">
            ${routeLink("/track-order", "Track order")}
            ${routeLink("/contact", "Contact")}
            ${routeLink("/reviews", "Reviews")}
          </div>
        </div>
      </div>
      <header class="site-header">
        <div class="site-header__inner">
          <button class="icon-button mobile-menu-button" data-action="open-mobile" aria-label="Open menu">${icon("menu")}</button>
          <nav class="main-nav" aria-label="Primary navigation">
            ${routeLink("/", "Home", "nav-link")}
            <button class="nav-trigger" data-action="toggle-mega" aria-expanded="false">Shop ${icon("chevron")}</button>
            ${routeLink("/collections/after-hours", "Collections", "nav-link")}
            ${routeLink("/contact", "Support", "nav-link")}
          </nav>
          ${routeLink("/", '<img src="/assets/logo.svg" alt="NOCTRA" />', "wordmark")}
          <div class="header-actions">
            <button class="header-text-action" data-action="open-search" aria-label="Search">Search</button>
            ${routeLink("/account", "Log in", "header-text-action account-action")}
            <button class="header-text-action cart-button" data-action="open-cart" aria-label="Open cart">Cart <span class="cart-count" data-cart-count>${cartCount()}</span></button>
            <button class="icon-button header-icon-search" data-action="open-search" aria-label="Search">${icon("search")}</button>
            <button class="icon-button header-icon-cart" data-action="open-cart" aria-label="Open cart">${icon("bag")}<span class="cart-count" data-cart-count>${cartCount()}</span></button>
          </div>
        </div>
      </header>
      <div class="mega-menu" id="mega-menu">
        <div class="mega-menu__inner">
          <div>
            <h3>Shop</h3>
            <ul>
              <li>${routeLink("/shop", "Shop all")}</li>
              <li>${routeLink("/shop/t-shirts", "T-Shirts")}</li>
              <li>${routeLink("/shop/hoodies", "Hoodies")}</li>
              <li>${routeLink("/shop/crewnecks", "Crewnecks")}</li>
            </ul>
          </div>
          <div>
            <h3>Collections</h3>
            <ul>
              <li>${routeLink("/collections/after-hours", "After Hours")}</li>
              <li>${routeLink("/collections/static-bloom", "Static Bloom")}</li>
              <li>${routeLink("/collections/archive-01", "Archive 01")}</li>
            </ul>
          </div>
          <a href="/collections/after-hours" data-route class="mega-menu__feature">
            <img src="/assets/editorial/editorial-a.jpg" alt="After Hours collection placeholder" />
            <div class="mega-menu__feature-copy"><span class="eyebrow">Newest drop</span><strong>After Hours</strong><span>Shop collection →</span></div>
          </a>
        </div>
      </div>`;
  }

  function footer() {
    return `
      <section class="reference-newsletter">
        <div class="container reference-newsletter__inner">
          <div>
            <span class="reference-newsletter__emoji">🔥</span>
            <h2>Join the Club</h2>
            <p>Sign up for 10% off your first order, early drop access, and members-only restock alerts.</p>
          </div>
          <form class="reference-newsletter__form" data-form="newsletter">
            <label class="sr-only" for="newsletter-email">Email address</label>
            <input id="newsletter-email" type="email" name="email" placeholder="Enter your email address" required />
            <button type="submit">Get 10% off</button>
          </form>
        </div>
      </section>
      <footer class="site-footer">
        <div class="container">
          <div class="footer-grid">
            <div class="footer-col"><h3>About</h3><ul><li>${routeLink("/about", "Our story")}</li><li>${routeLink("/reviews", "Reviews")}</li><li><a href="#">Community</a></li></ul></div>
            <div class="footer-col"><h3>Customer care</h3><ul><li>${routeLink("/contact", "Contact us")}</li><li>${routeLink("/track-order", "Track your order")}</li><li>${routeLink("/shipping", "Shipping & returns")}</li><li>${routeLink("/size-guide", "Size guide")}</li><li>${routeLink("/wash-guide", "Wash guide")}</li></ul></div>
            <div class="footer-col"><h3>Quick links</h3><ul><li>${routeLink("/shop", "Shop all")}</li><li>${routeLink("/shop/t-shirts", "T-Shirts")}</li><li>${routeLink("/shop/hoodies", "Hoodies")}</li><li>${routeLink("/shop/crewnecks", "Crewnecks")}</li></ul></div>
            <div class="footer-brand">
              <img src="/assets/logo.svg" alt="NOCTRA" />
              <p>An original placeholder streetwear brand used to demonstrate the reference store's UX pattern without copying its identity or artwork.</p>
              <div class="footer-country"><span>Country/region</span><button type="button">United States (USD $)⌄</button></div>
              <div class="socials"><a href="#">Instagram</a><a href="#">TikTok</a><a href="#">Pinterest</a></div>
            </div>
          </div>
          <div class="footer-bottom"><span>© 2026 NOCTRA</span><div><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Accessibility</a></div></div>
        </div>
      </footer>`;
  }

  function shell(content, options = {}) {
    if (options.checkout) return content;
    return `${header()}${options.announcementBefore ? announcement() : ""}<main id="main">${content}</main>${footer()}`;
  }

  function productCard(product) {
    const badgeClass = product.soldOut ? " product-card__badge--sold" : "";
    const badge = product.soldOut ? "Sold out" : product.badge;
    return `
      <article class="product-card" data-product-card="${product.id}">
        <div class="product-card__media">
          <a href="/products/${product.slug}" data-route class="product-card__image-link" aria-label="View ${product.name}">
            <span class="product-card__badge${badgeClass}">${badge}</span>
            <img src="${product.image}" alt="${product.name} front placeholder" />
            <img src="${product.altImage}" alt="${product.name} back placeholder" />
          </a>
          <button type="button" class="quick-add" data-action="quick-add" data-product="${product.id}" ${product.soldOut ? "disabled" : ""}>${product.soldOut ? "Sold out" : "Quick add"}</button>
        </div>
        <div class="product-card__body">
          <h3 class="product-card__name">${routeLink(`/products/${product.slug}`, product.name)}</h3>
          <div class="product-card__reviews"><span>★★★★★</span> <small>${product.reviews} reviews</small></div>
          <div class="product-card__meta">
            <div class="product-card__price"><span class="product-card__compare">${money(product.compareAt)}</span><strong>${money(product.price)}</strong></div>
            <div class="product-card__dots" aria-label="${product.colors.length} colors"><span></span>${product.colors.length > 1 ? "<span></span>" : ""}</div>
          </div>
        </div>
      </article>`;
  }

  function productRail(products) {
    return `<div class="product-rail">${products.map(productCard).join("")}</div>`;
  }

  function reviewTicker() {
    const items = [
      "👾 The weight and fit are perfect — Morgan",
      "❤️‍🔥 The print feels premium, not plasticky — Dani",
      "🏁 Finally an oversized hoodie that holds its shape — Chris",
      "✦ Better in person and still looks new after washing — Taylor"
    ];
    const group = items.map((item) => `<span>${item}</span>`).join("<span>・</span>");
    return `<div class="review-ticker"><div class="marquee"><div class="marquee__group">${group}</div><div class="marquee__group" aria-hidden="true">${group}</div></div></div>`;
  }

  function homePage() {
    const featured = DATA.products.slice(0, 6);
    const capsule = DATA.products.slice(6, 12);
    const classics = DATA.products;
    const communityImages = [
      "/assets/editorial/editorial-a.jpg",
      "/assets/editorial/editorial-b.jpg",
      "/assets/editorial/editorial-c.jpg",
      "/assets/editorial/community-wide.jpg",
      "/assets/hero-main.jpg",
      "/assets/editorial/editorial-b.jpg"
    ];
    return shell(`
      <section class="reference-hero">
        <img src="/assets/hero-main.jpg" alt="Streetwear campaign placeholder" />
        <div class="reference-hero__shade"></div>
        <div class="reference-hero__content">
          <a href="/shop" data-route class="reference-hero__button">Shop now</a>
        </div>
      </section>
      ${announcement()}

      <section class="reference-section reference-section--featured">
        <div class="reference-heading">
          <h1>The greatest collection we've made</h1>
          <p>Premium heavyweight essentials, expressive graphics, and limited-run colorways.</p>
        </div>
        <div class="reference-product-grid reference-product-grid--three">${featured.map(productCard).join("")}</div>
        <div class="reference-section__cta"><a href="/shop" data-route class="reference-outline-button">Shop all products</a></div>
      </section>

      ${reviewTicker()}

      <section class="reference-section reference-section--capsule">
        <div class="reference-heading reference-heading--urgent">
          <h2>🚨 Final capsule restock 🚨</h2>
          <p>One last release from the archive. Once these sizes are gone, this capsule closes.</p>
        </div>
        <div class="reference-product-grid reference-product-grid--three">${capsule.map(productCard).join("")}</div>
      </section>

      <section class="reference-proof">
        <div class="container reference-proof__grid">
          <div class="reference-proof__intro">
            <h2>What our customers say.</h2>
            <a href="/reviews" data-route>Read the reviews →</a>
          </div>
          <div class="reference-proof__stat">
            <div class="reference-proof__stars">★★★★★</div>
            <strong>4.9/5</strong>
            <p>Average score from more than 1,250 verified-style reviews.</p>
          </div>
          <div class="reference-proof__stat">
            <div class="reference-proof__stars">★★★★★</div>
            <strong>99%</strong>
            <p>Would recommend NOCTRA to a friend.</p>
          </div>
        </div>
      </section>

      <section class="reference-section reference-section--classics">
        <div class="reference-heading reference-heading--left">
          <span>The core collection</span>
          <h2>The GOAT</h2>
          <p>Shop the classics that shaped the first NOCTRA releases.</p>
        </div>
        <div class="reference-product-grid reference-product-grid--four">${classics.map(productCard).join("")}</div>
      </section>

      <section class="reference-story">
        <div class="reference-story__image"><img src="/assets/editorial/editorial-a.jpg" alt="NOCTRA campaign placeholder" /></div>
        <div class="reference-story__copy">
          <span>About the brand</span>
          <h2>Why NOCTRA?</h2>
          <p class="reference-story__lead">Clothing should feel like confidence before anyone reads the graphic.</p>
          <p>NOCTRA is an original placeholder identity created for this implementation. Its product language focuses on heavyweight construction, easy oversized fits, limited drops, and artwork that feels collected rather than disposable.</p>
          <p>The shopping experience keeps discovery direct: strong campaign imagery, clean product grids, clear sizing information, visible reviews, and a persistent cart that works across every page.</p>
          <a href="/about" data-route class="reference-outline-button">Learn about NOCTRA</a>
        </div>
      </section>

      <section class="reference-community">
        <div class="container">
          <div class="reference-heading">
            <h2>Join the 60k-strong NOCTRA family</h2>
            <p>Follow the community and tag your fit for a chance to be featured.</p>
          </div>
          <div class="reference-community__grid">${communityImages.map((src, index) => `<a href="#" class="reference-community__card"><img src="${src}" alt="Community style placeholder ${index + 1}"/><span>@noctra.community</span></a>`).join("")}</div>
        </div>
      </section>`);
  }

  function shopPage(category = null) {
    let products = [...DATA.products];
    if (category) products = products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    if (state.filters.categories.length) products = products.filter((p) => state.filters.categories.includes(p.category));
    if (state.filters.availableOnly) products = products.filter((p) => !p.soldOut);
    if (state.filters.under50) products = products.filter((p) => p.price < 50);
    if (state.sort === "price-asc") products.sort((a,b) => a.price - b.price);
    if (state.sort === "price-desc") products.sort((a,b) => b.price - a.price);
    if (state.sort === "name") products.sort((a,b) => a.name.localeCompare(b.name));
    const title = category || "Shop all";
    return shell(`
      ${announcement()}
      <section class="page-hero"><div class="container"><div class="breadcrumbs">${routeLink("/", "Home")} / Shop</div><div class="page-hero__row"><h1 class="display">${title}</h1><p>${category ? `Explore all ${category.toLowerCase()} in the current placeholder catalog.` : "Explore every current drop, core style, hoodie, crewneck, and heavyweight graphic tee."}</p></div></div></section>
      <div class="shop-toolbar"><div class="container shop-toolbar__inner"><div class="category-pills"><a href="/shop" data-route class="pill ${!category ? "is-active" : ""}">All</a><a href="/shop/t-shirts" data-route class="pill ${category === "T-Shirts" ? "is-active" : ""}">T-Shirts</a><a href="/shop/hoodies" data-route class="pill ${category === "Hoodies" ? "is-active" : ""}">Hoodies</a><a href="/shop/crewnecks" data-route class="pill ${category === "Crewnecks" ? "is-active" : ""}">Crewnecks</a></div><div class="toolbar-actions"><span class="product-count">${products.length} products</span><button data-action="open-filter">Filter</button><select data-action="sort" aria-label="Sort products"><option value="featured" ${state.sort === "featured" ? "selected" : ""}>Featured</option><option value="price-asc" ${state.sort === "price-asc" ? "selected" : ""}>Price low-high</option><option value="price-desc" ${state.sort === "price-desc" ? "selected" : ""}>Price high-low</option><option value="name" ${state.sort === "name" ? "selected" : ""}>Alphabetical</option></select></div></div></div>
      <section class="shop-results"><div class="container">${products.length ? `<div class="product-grid">${products.map(productCard).join("")}</div>` : `<div class="empty-state"><div><h2>No signal found.</h2><p>Try clearing one of the active filters.</p><button class="btn" data-action="reset-filters">Reset filters</button></div></div>`}</div></section>`, { announcementBefore: false });
  }

  function collectionPage(slug) {
    const collection = DATA.collections.find((item) => item.slug === slug);
    if (!collection) return notFoundPage();
    const products = DATA.products.filter((item) => item.collection === collection.name);
    return shell(`
      ${announcement()}
      <section class="collection-banner"><img src="${collection.image}" alt="${collection.name} collection placeholder"/><div class="container collection-banner__copy"><span class="kicker">${collection.eyebrow}</span><h1 class="display">${collection.name}</h1><p>${collection.description}</p><a href="#collection-products" class="btn btn--light">Shop collection ${icon("arrow")}</a></div></section>
      <section class="section" id="collection-products"><div class="container"><div class="section-head"><div><span class="kicker">${collection.eyebrow}</span><h2 class="section-title">The full drop.</h2></div><span class="muted">${products.length} pieces</span></div><div class="product-grid">${products.map(productCard).join("")}</div></div></section>`);
  }

  function accordionItem(title, body, open = false) {
    return `<div class="accordion__item ${open ? "is-open" : ""}"><button class="accordion__trigger" data-action="accordion"><span>${title}</span><span>+</span></button><div class="accordion__panel">${body}</div></div>`;
  }

  function productPage(slug) {
    const product = DATA.products.find((item) => item.slug === slug);
    if (!product) return notFoundPage();
    const related = DATA.products.filter((item) => item.id !== product.id && (item.category === product.category || item.collection === product.collection)).slice(0, 5);
    return shell(`
      ${announcement()}
      <section class="product-page"><div class="container"><div class="breadcrumbs">${routeLink("/", "Home")} / ${routeLink("/shop", "Shop")} / ${product.name}</div><div class="product-layout">
        <div class="product-gallery">
          <div class="product-gallery__item"><img src="${product.image}" alt="${product.name} front placeholder"/></div>
          <div class="product-gallery__item"><img src="${product.altImage}" alt="${product.name} back placeholder"/></div>
          <div class="product-gallery__item product-gallery__item--wide"><img src="${product.image}" alt="${product.name} detail placeholder" style="object-position:center 34%;transform:scale(1.15)"/></div>
        </div>
        <aside class="product-info" data-product-view="${product.id}">
          <span class="eyebrow">${product.collection} / ${product.category}</span>
          <h1>${product.name}</h1>
          <div class="product-rating"><span class="stars">★★★★★</span><span>${product.rating} (${product.reviews})</span></div>
          <div class="product-price"><s>${money(product.compareAt)}</s><strong>${money(product.price)} USD</strong></div>
          <p class="product-summary">${product.summary}</p>
          <div class="option-group"><div class="option-label"><span>Color — <b data-selected-color>${product.colors[0]}</b></span></div><div class="swatches">${product.colors.map((color, i) => `<button class="swatch ${i === 0 ? "is-selected" : ""}" data-action="select-color" data-color="${color}"><span class="swatch-dot"></span>${color}</button>`).join("")}</div></div>
          <div class="option-group"><div class="option-label"><span>Size — <b data-selected-size>M</b></span>${routeLink("/size-guide", "Size guide")}</div><div class="sizes">${product.sizes.map((size) => `<button class="size-button ${size === "M" ? "is-selected" : ""}" data-action="select-size" data-size="${size}">${size}</button>`).join("")}</div></div>
          <button class="btn btn--wide btn--accent" data-action="add-product" data-product="${product.id}" ${product.soldOut ? "disabled" : ""}>${product.soldOut ? "Sold out" : "Add to bag"}</button>
          <div class="fit-meter"><div class="fit-meter__labels"><span>Runs smaller</span><span>True to size</span><span>Runs larger</span></div><div class="fit-meter__track"></div><small>${product.fit}</small></div>
          <ul class="feature-list">${product.features.map((feature) => `<li>${feature}</li>`).join("")}</ul>
          <div class="accordion">
            ${accordionItem("Shipping & delivery", "Orders are prepared in 2–5 business days. Estimated US delivery is 3–7 business days after dispatch. This prototype does not calculate live rates.", true)}
            ${accordionItem("90-day quality warranty", "Placeholder policy: manufacturing defects are eligible for replacement for 90 days after fulfillment.")}
            ${accordionItem("Size chart", "Standard US unisex sizing. T-shirts use a boxy cut; hoodies are intentionally oversized. Visit the full size guide for garment measurements.")}
            ${accordionItem("Climate commitment", "Placeholder sustainability section for ethical production, lower-waste made-to-order workflows, recyclable packaging, and carbon-aware shipping.")}
            ${accordionItem("Returns", "Placeholder policy: unworn items may be requested for return within 14 days. Final terms should be replaced before launch.")}
          </div>
        </aside>
      </div>
      <div class="trust-row"><div class="trust-card"><span class="trust-card__icon">✦</span><strong>Printed to last</strong><p>Durable, soft-hand artwork designed to resist cracking.</p></div><div class="trust-card"><span class="trust-card__icon">☁</span><strong>Heavyweight blanks</strong><p>Structured cotton and fleece with deliberate drape.</p></div><div class="trust-card"><span class="trust-card__icon">↺</span><strong>Lower-waste runs</strong><p>Small-batch and made-to-order compatible product flow.</p></div><div class="trust-card"><span class="trust-card__icon">✓</span><strong>Quality warranty</strong><p>Clear reassurance directly on the product page.</p></div></div>
      </div></section>
      ${reviewTicker()}
      <section class="section"><div class="container"><div class="section-head"><div><span class="kicker">Keep browsing</span><h2 class="section-title">You may also like.</h2></div></div>${productRail(related)}</div></section>`);
  }

  function sideNav() {
    return `<aside class="content-nav"><h2>Customer care</h2><ul><li>${routeLink("/contact", "Contact us")}</li><li>${routeLink("/track-order", "Order status")}</li><li>${routeLink("/size-guide", "Size guide")}</li><li>${routeLink("/wash-guide", "Wash guide")}</li><li>${routeLink("/shipping", "Shipping information")}</li><li>${routeLink("/reviews", "Reviews")}</li></ul></aside>`;
  }

  function contentPage(title, body) {
    return shell(`${announcement()}<section class="content-page"><div class="container content-grid">${sideNav()}<article class="prose"><div class="breadcrumbs">${routeLink("/", "Home")} / ${title}</div><h1>${title}</h1>${body}</article></div></section>`);
  }

  function aboutPage() {
    return shell(`${announcement()}<section class="story-grid"><div class="story-grid__media"><img src="/assets/editorial/editorial-3.svg" alt="NOCTRA studio story placeholder"/></div><div class="story-grid__copy"><span class="kicker">Our story</span><h1 class="section-title">Built from a late-night idea.</h1><p class="quote">A fictional brand. A complete storefront foundation.</p><p>NOCTRA is original placeholder branding used to demonstrate the visual system, shopping flow, page hierarchy, and interaction model of a polished streetwear store without copying another brand’s identity, product artwork, or written content.</p><p>The concept centers on heavyweight garments, expressive graphic layouts, and an editorial rhythm that repeatedly connects campaign imagery to shoppable products.</p></div></section><section class="section"><div class="container"><div class="page-hero__row"><h2 class="display">Expression first.</h2><div><p>Large campaign moments create mood. Product grids provide clarity. Reviews reduce uncertainty. Deep product pages answer fit, shipping, care, and quality questions before checkout.</p><p>The entire prototype is data-driven, so product names, imagery, prices, categories, collections, and content can be replaced without rewriting the page structure.</p></div></div></div></section>`);
  }

  function sizeGuidePage() {
    return contentPage("Size guide", `
      <p>Use these placeholder garment measurements as a structural example. Replace them with measurements from your actual blanks before launch.</p>
      <div class="callout"><strong>How to measure:</strong> Lay a garment flat. Measure width one inch below the armhole, then measure length from the highest shoulder point to the hem.</div>
      <h2>T-Shirts</h2><p>Standard unisex sizing. Vintage colorways are intentionally oversized.</p>
      <table><thead><tr><th>Size</th><th>Body width</th><th>Body length</th></tr></thead><tbody><tr><td>S</td><td>18 in</td><td>29 in</td></tr><tr><td>M</td><td>20 in</td><td>30 in</td></tr><tr><td>L</td><td>22 in</td><td>31 in</td></tr><tr><td>XL</td><td>24 in</td><td>31.5 in</td></tr><tr><td>2XL</td><td>26 in</td><td>33 in</td></tr><tr><td>3XL</td><td>28 in</td><td>35 in</td></tr></tbody></table>
      <h2>Hoodies</h2><table><thead><tr><th>Size</th><th>Chest</th><th>Body length</th></tr></thead><tbody><tr><td>S</td><td>21 in</td><td>28.5 in</td></tr><tr><td>M</td><td>23 in</td><td>29.5 in</td></tr><tr><td>L</td><td>24.5 in</td><td>30.5 in</td></tr><tr><td>XL</td><td>26.5 in</td><td>31.5 in</td></tr><tr><td>2XL</td><td>27.5 in</td><td>32.5 in</td></tr><tr><td>3XL</td><td>28.5 in</td><td>33.5 in</td></tr></tbody></table>
      <h2>Crewnecks</h2><table><thead><tr><th>Size</th><th>Chest</th><th>Body length</th></tr></thead><tbody><tr><td>S</td><td>20 in</td><td>27 in</td></tr><tr><td>M</td><td>22 in</td><td>28 in</td></tr><tr><td>L</td><td>24 in</td><td>29 in</td></tr><tr><td>XL</td><td>26 in</td><td>30 in</td></tr><tr><td>2XL</td><td>28 in</td><td>31 in</td></tr><tr><td>3XL</td><td>30 in</td><td>32 in</td></tr></tbody></table>`);
  }

  function washGuidePage() {
    return contentPage("Wash guide", `
      <p>Good care preserves garment shape, color, and printed artwork. The steps below are safe placeholder guidance for most cotton streetwear.</p>
      <h2>1. Turn garments inside out</h2><p>This reduces direct friction against printed artwork and helps preserve surface color.</p>
      <h2>2. Wash cold</h2><p>Use a gentle cycle with similar colors. Avoid bleach and strong stain treatments directly on the print.</p>
      <h2>3. Air dry when possible</h2><p>Hang dry or lay flat. When a dryer is necessary, use the lowest heat setting.</p>
      <h2>4. Do not iron the graphic</h2><p>Iron inside out on low heat and keep direct heat away from printed areas.</p>
      <div class="callout">Always replace this guidance with instructions that match your exact garment blanks, inks, embroidery, and wash treatments.</div>`);
  }

  function shippingPage() {
    return contentPage("Shipping information", `
      <p>This page demonstrates the information architecture for shipping expectations. It does not connect to a real carrier or fulfillment service.</p>
      <h2>Production time</h2><p>Placeholder estimate: 2–5 business days before dispatch. Pre-orders and limited drops may require additional time.</p>
      <h2>United States</h2><p>Standard delivery: 3–7 business days after dispatch. Free standard shipping is shown for orders over $75.</p>
      <h2>International</h2><p>Placeholder estimate: 7–18 business days. Duties, taxes, and import fees may be collected by the destination country.</p>
      <h2>Tracking</h2><p>Customers would normally receive a shipping confirmation email containing a carrier tracking link.</p>
      <h2>Lost or damaged packages</h2><p>Provide a clear contact path and list the evidence required, such as an order number and package photos.</p>`);
  }

  function trackOrderPage() {
    return shell(`${announcement()}<section class="content-page"><div class="container"><div class="contact-layout"><div class="prose"><div class="breadcrumbs">${routeLink("/", "Home")} / Order status</div><h1>Track your order.</h1><p>Enter an order number and email address to preview the tracking flow. This prototype returns a sample status rather than contacting a carrier.</p></div><form class="form-grid" data-form="tracking"><div class="field field--full"><label>Order number</label><input name="order" placeholder="#10042" required/></div><div class="field field--full"><label>Email address</label><input type="email" name="email" placeholder="you@example.com" required/></div><div class="field field--full"><button class="btn btn--wide" type="submit">Check status</button></div><div class="field field--full" id="tracking-result"></div></form></div></div></section>`);
  }

  function contactPage() {
    return shell(`${announcement()}<section class="content-page"><div class="container"><div class="contact-layout"><div class="prose"><div class="breadcrumbs">${routeLink("/", "Home")} / Contact</div><h1>Get in touch.</h1><p>Questions about sizing, an order, a product, or a future drop? This form demonstrates the support flow and success state.</p><div class="support-cards"><div class="support-card"><div><h3>Email support</h3><p>Response within 24 hours</p></div><strong>support@example.com</strong></div><div class="support-card"><div><h3>Instagram</h3><p>Response within 48 hours</p></div><strong>@noctra.placeholder</strong></div><div class="support-card"><div><h3>Order status</h3><p>Use your order number and email</p></div>${routeLink("/track-order", "Track →")}</div></div></div><form class="form-grid" data-form="contact"><div class="field"><label>Name *</label><input name="name" placeholder="Full name" required/></div><div class="field"><label>Email *</label><input type="email" name="email" placeholder="Email address" required/></div><div class="field field--full"><label>Order number</label><input name="order" placeholder="Optional"/></div><div class="field field--full"><label>Message *</label><textarea name="message" placeholder="How can we help?" required></textarea></div><div class="field field--full"><button class="btn btn--wide" type="submit">Send message</button></div></form></div></div></section>`);
  }

  function reviewsPage() {
    return shell(`${announcement()}<section class="content-page"><div class="container"><div class="breadcrumbs">${routeLink("/", "Home")} / Reviews</div><div class="section-head"><div><span class="kicker">Verified-style feedback</span><h1 class="display">Customer reviews.</h1></div><p>Original placeholder reviews demonstrate the social-proof layout and filtering-ready card structure.</p></div><div class="review-summary"><div style="background:var(--ink);color:var(--white)"><span class="kicker">Overall rating</span><div class="stats__value">4.9</div><div class="stars">★★★★★</div></div><div><span class="eyebrow">Review count</span><div class="stats__value">1,250+</div><p>Verified customer reviews</p></div><div><span class="eyebrow">Recommendation</span><div class="stats__value">99%</div><p>Would recommend to a friend</p></div></div><div class="review-list">${DATA.reviews.map((review) => `<article class="review-card"><div class="stars">${"★".repeat(review.rating)}</div><h3>${review.title}</h3><p>${review.body}</p><div class="review-card__bottom"><strong>${review.name}</strong><span>${review.product}</span></div></article>`).join("")}</div></div></section>`);
  }

  function accountPage() {
    return shell(`${announcement()}<section class="content-page"><div class="container"><div class="contact-layout"><div class="prose"><div class="breadcrumbs">${routeLink("/", "Home")} / Account</div><h1>Welcome back.</h1><p>This placeholder account page demonstrates entry into order history, saved addresses, returns, and faster checkout.</p><p>No authentication service is connected.</p></div><form class="form-grid" data-form="account"><div class="field field--full"><label>Email address</label><input type="email" required placeholder="you@example.com"/></div><div class="field field--full"><label>Password</label><input type="password" required placeholder="••••••••"/></div><div class="field field--full"><button class="btn btn--wide" type="submit">Log in</button></div><div class="field field--full"><button class="btn btn--wide btn--outline" type="button" data-action="demo-register">Create account</button></div></form></div></div></section>`);
  }

  function searchPage(query = "") {
    const normalized = query.trim().toLowerCase();
    const products = normalized ? DATA.products.filter((p) => `${p.name} ${p.category} ${p.collection}`.toLowerCase().includes(normalized)) : DATA.products;
    return shell(`${announcement()}<section class="content-page"><div class="container"><div class="breadcrumbs">${routeLink("/", "Home")} / Search</div><h1 class="display" style="margin-bottom:35px">Search.</h1><form class="search-page__bar" data-form="search-page"><input name="q" value="${query.replaceAll('"','&quot;')}" placeholder="Search products" aria-label="Search products" autofocus/><button type="submit" aria-label="Submit search">${icon("arrow")}</button></form>${normalized ? `<p class="muted" style="margin-bottom:28px">${products.length} result${products.length === 1 ? "" : "s"} for “${query}”</p>` : ""}${products.length ? `<div class="product-grid">${products.map(productCard).join("")}</div>` : `<div class="empty-state"><div><h2>No result.</h2><p>Try a product type, collection name, or broader phrase.</p></div></div>`}</div></section>`);
  }

  function cartLineMarkup(line, compact = false) {
    const product = DATA.products.find((item) => item.id === line.productId);
    if (!product) return "";
    const key = encodeURIComponent(lineKey(line));
    return `<article class="cart-line"><a href="/products/${product.slug}" data-route class="cart-line__image"><img src="${product.image}" alt="${product.name}"/></a><div><h3>${routeLink(`/products/${product.slug}`, product.name)}</h3><div class="cart-line__meta">${line.color} / ${line.size}</div><div class="qty-control"><button data-action="qty-dec" data-key="${key}" aria-label="Decrease quantity">−</button><span>${line.qty}</span><button data-action="qty-inc" data-key="${key}" aria-label="Increase quantity">+</button></div></div><div class="cart-line__price"><strong>${money(product.price * line.qty)}</strong><button class="remove-link" data-action="remove-line" data-key="${key}">Remove</button></div></article>`;
  }

  function shippingProgressMarkup() {
    const subtotal = cartSubtotal();
    const threshold = DATA.brand.shippingThreshold;
    const remaining = Math.max(0, threshold - subtotal);
    const width = Math.min(100, (subtotal / threshold) * 100);
    return `<div class="shipping-progress"><strong>${remaining > 0 ? `Spend ${money(remaining)} more for free shipping` : "You unlocked free shipping 🎉"}</strong><div class="shipping-progress__track"><div class="shipping-progress__bar" style="width:${width}%"></div></div></div>`;
  }

  function cartPage() {
    const subtotal = cartSubtotal();
    if (!state.cart.length) {
      return shell(`${announcement()}<section class="cart-page"><div class="container empty-state"><div><span class="kicker">Cart (0)</span><h2>Your bag is empty.</h2><p>Start with the latest drop or browse the full catalog.</p><a href="/shop" data-route class="btn">Continue shopping</a></div></div></section><section class="section section--dark"><div class="container"><div class="section-head"><div><span class="kicker">Popular picks</span><h2 class="section-title">Start here.</h2></div></div>${productRail(DATA.products.slice(0,5))}</div></section>`);
    }
    return shell(`${announcement()}<section class="cart-page"><div class="container"><div class="section-head"><h1 class="display">Your bag.</h1><span>${cartCount()} item${cartCount() === 1 ? "" : "s"}</span></div><div class="cart-page__layout"><div class="cart-list">${state.cart.map((line) => cartLineMarkup(line)).join("")}</div><aside class="cart-summary">${shippingProgressMarkup()}<h2>Order summary</h2><div class="summary-row"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="summary-row"><span>Shipping</span><span>${subtotal >= DATA.brand.shippingThreshold ? "Free" : "Calculated next"}</span></div><div class="summary-row"><span>Taxes</span><span>Calculated next</span></div><div class="summary-row summary-row--total"><span>Total</span><span>${money(subtotal)}</span></div><a href="/checkout" data-route class="btn btn--wide btn--accent">Secure checkout</a><p class="checkout-note">Checkout is a UI placeholder. No payment information is collected or processed.</p></aside></div></div></section>`);
  }

  function checkoutPage() {
    if (!state.cart.length) return cartPage();
    const subtotal = cartSubtotal();
    return shell(`<main class="checkout-shell"><section class="checkout-main"><a href="/" data-route class="checkout-logo"><img src="/assets/logo.svg" alt="NOCTRA"/></a><div class="checkout-steps"><span>Information</span><span>Shipping</span><span>Payment</span></div><h1 class="section-title">Contact information</h1><div class="checkout-box"><div class="field"><label>Email</label><input type="email" placeholder="you@example.com"/></div></div><h2>Delivery address</h2><div class="form-grid"><div class="field"><label>First name</label><input/></div><div class="field"><label>Last name</label><input/></div><div class="field field--full"><label>Address</label><input/></div><div class="field"><label>City</label><input/></div><div class="field"><label>State</label><select><option>Select state</option><option>Wisconsin</option><option>Illinois</option><option>California</option></select></div><div class="field"><label>ZIP code</label><input/></div><div class="field"><label>Country</label><select><option>United States</option></select></div></div><h2>Payment</h2><div class="checkout-placeholder"><strong>Payment placeholder</strong><br/>Connect Shopify, Stripe, or another commerce backend here.</div><button class="btn btn--wide" style="margin-top:22px" data-action="demo-order">Complete demo order</button><p class="checkout-note">This button only displays a prototype confirmation.</p></section><aside class="checkout-side"><h2>Order summary</h2><div class="mini-order">${state.cart.map((line) => { const p = DATA.products.find((item) => item.id === line.productId); return p ? `<div class="mini-order__line"><img src="${p.image}" alt="${p.name}"/><div><strong>${p.name}</strong><small>${line.color} / ${line.size} × ${line.qty}</small></div><b>${money(p.price * line.qty)}</b></div>` : ""; }).join("")}</div><div style="margin-top:32px"><div class="summary-row"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="summary-row"><span>Shipping</span><span>${subtotal >= DATA.brand.shippingThreshold ? "Free" : "Calculated"}</span></div><div class="summary-row summary-row--total"><span>Total</span><span>${money(subtotal)}</span></div></div></aside></main>`, { checkout: true });
  }

  function notFoundPage() {
    return shell(`${announcement()}<section class="empty-state"><div><span class="kicker">404</span><h2>Signal lost.</h2><p>The page you requested is not part of this prototype.</p><a href="/" data-route class="btn">Return home</a></div></section>`);
  }

  function getRoute() {
    return window.location.pathname.replace(/\/+$/, "") || "/";
  }

  function render() {
    closeAllOverlays();
    state.megaOpen = false;
    const path = getRoute();
    let html;
    if (path === "/") html = homePage();
    else if (path === "/shop") html = shopPage();
    else if (path === "/shop/t-shirts") html = shopPage("T-Shirts");
    else if (path === "/shop/hoodies") html = shopPage("Hoodies");
    else if (path === "/shop/crewnecks") html = shopPage("Crewnecks");
    else if (path.startsWith("/collections/")) html = collectionPage(path.split("/").pop());
    else if (path.startsWith("/products/")) html = productPage(path.split("/").pop());
    else if (path === "/about") html = aboutPage();
    else if (path === "/size-guide") html = sizeGuidePage();
    else if (path === "/wash-guide") html = washGuidePage();
    else if (path === "/shipping") html = shippingPage();
    else if (path === "/track-order") html = trackOrderPage();
    else if (path === "/contact") html = contactPage();
    else if (path === "/reviews") html = reviewsPage();
    else if (path === "/account") html = accountPage();
    else if (path === "/search") html = searchPage(new URLSearchParams(location.search).get("q") || "");
    else if (path === "/cart") html = cartPage();
    else if (path === "/checkout") html = checkoutPage();
    else html = notFoundPage();
    app.innerHTML = html;
    document.title = getTitle(path);
    updateCartBadges();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function getTitle(path) {
    if (path === "/") return "NOCTRA — Streetwear Storefront Prototype";
    const clean = path.split("/").filter(Boolean).pop()?.replaceAll("-", " ") || "Store";
    return `${clean.replace(/\b\w/g, (c) => c.toUpperCase())} — NOCTRA`;
  }

  function navigate(path) {
    if (window.location.pathname + window.location.search === path) return;
    history.pushState({}, "", path);
    render();
  }

  function updateCartBadges() {
    document.querySelectorAll("[data-cart-count]").forEach((node) => { node.textContent = cartCount(); });
  }

  function addToCart(productId, color = null, size = "M") {
    const product = DATA.products.find((item) => item.id === productId);
    if (!product || product.soldOut) return;
    const selectedColor = color || product.colors[0];
    const existing = state.cart.find((line) => line.productId === productId && line.color === selectedColor && line.size === size);
    if (existing) existing.qty += 1;
    else state.cart.push({ productId, color: selectedColor, size, qty: 1 });
    saveCart();
    showToast(`${product.name} added to bag`);
    openCart();
  }

  function modifyLine(key, delta) {
    const decoded = decodeURIComponent(key);
    const line = state.cart.find((item) => lineKey(item) === decoded);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) state.cart = state.cart.filter((item) => lineKey(item) !== decoded);
    saveCart();
    refreshCartUI();
  }

  function removeLine(key) {
    const decoded = decodeURIComponent(key);
    state.cart = state.cart.filter((item) => lineKey(item) !== decoded);
    saveCart();
    refreshCartUI();
  }

  function refreshCartUI() {
    if (getRoute() === "/cart" || getRoute() === "/checkout") render();
    else if (state.activeOverlay === "cart") openCart();
  }

  function renderOverlayBase() {
    overlayRoot.innerHTML = `<div class="overlay" data-action="close-overlay"></div>`;
  }

  function openCart() {
    state.activeOverlay = "cart";
    const subtotal = cartSubtotal();
    renderOverlayBase();
    overlayRoot.insertAdjacentHTML("beforeend", `<aside class="drawer" aria-label="Shopping cart"><div class="drawer__head"><h2>Your cart (${cartCount()})</h2><button class="icon-button" data-action="close-cart" aria-label="Close cart">${icon("close")}</button></div><div class="drawer__body">${shippingProgressMarkup()}${state.cart.length ? state.cart.map((line) => cartLineMarkup(line, true)).join("") : `<div class="empty-state" style="min-height:360px"><div><h2>Your bag is empty.</h2><p>Browse the latest signal.</p><a href="/shop" data-route class="btn">Continue shopping</a></div></div>`}</div>${state.cart.length ? `<div class="drawer__foot"><div class="summary-row summary-row--total"><span>Subtotal</span><span>${money(subtotal)}</span></div><a href="/checkout" data-route class="btn btn--wide btn--accent">Secure checkout</a><a href="/cart" data-route class="text-link" style="margin-top:16px">View cart</a></div>` : ""}</aside>`);
    requestAnimationFrame(() => {
      overlayRoot.querySelector(".overlay")?.classList.add("is-open");
      overlayRoot.querySelector(".drawer")?.classList.add("is-open");
    });
    document.body.classList.add("is-locked");
  }

  function openSearch() {
    state.activeOverlay = "search";
    overlayRoot.innerHTML = `<section class="search-overlay"><div class="container search-overlay__head"><form class="search-overlay__form" data-form="search-overlay"><input name="q" type="search" placeholder="Search the store" aria-label="Search the store" autocomplete="off"/><button class="icon-button" type="button" data-action="close-search" aria-label="Close search">${icon("close")}</button></form></div><div class="container search-results" id="overlay-search-results"><div class="section-head"><div><span class="kicker">Popular searches</span><h2 class="section-title">Start with a signal.</h2></div></div>${productRail(DATA.products.slice(0,5))}</div></section>`;
    requestAnimationFrame(() => {
      overlayRoot.querySelector(".search-overlay")?.classList.add("is-open");
      overlayRoot.querySelector("input")?.focus();
    });
    document.body.classList.add("is-locked");
  }

  function updateOverlaySearch(value) {
    const target = document.getElementById("overlay-search-results");
    if (!target) return;
    const query = value.trim().toLowerCase();
    const results = query ? DATA.products.filter((p) => `${p.name} ${p.category} ${p.collection}`.toLowerCase().includes(query)) : DATA.products.slice(0,5);
    target.innerHTML = `<div class="section-head"><div><span class="kicker">${query ? `${results.length} results` : "Popular searches"}</span><h2 class="section-title">${query ? `Results for “${value}”` : "Start with a signal."}</h2></div>${query ? `<a href="/search?q=${encodeURIComponent(value)}" data-route class="text-link">View results ${icon("arrow")}</a>` : ""}</div>${results.length ? `<div class="product-grid">${results.slice(0,8).map(productCard).join("")}</div>` : `<div class="empty-state"><div><h2>No signal.</h2><p>Try another phrase.</p></div></div>`}`;
  }

  function openMobile() {
    state.activeOverlay = "mobile";
    overlayRoot.innerHTML = `<nav class="mobile-nav" aria-label="Mobile navigation"><div class="mobile-nav__head"><a href="/" data-route class="wordmark"><img src="/assets/logo.svg" alt="NOCTRA"/></a><button class="icon-button" data-action="close-mobile" aria-label="Close menu">${icon("close")}</button></div><div class="mobile-nav__body"><h3>Shop</h3>${routeLink("/shop", "Shop all")}${routeLink("/shop/t-shirts", "T-Shirts")}${routeLink("/shop/hoodies", "Hoodies")}${routeLink("/shop/crewnecks", "Crewnecks")}<h3>Collections</h3>${routeLink("/collections/after-hours", "After Hours")}${routeLink("/collections/static-bloom", "Static Bloom")}${routeLink("/collections/archive-01", "Archive 01")}<h3>Brand</h3>${routeLink("/about", "Our story")}${routeLink("/reviews", "Reviews")}<div class="mobile-nav__utility">${routeLink("/track-order", "Order status")}${routeLink("/contact", "Contact")}${routeLink("/size-guide", "Size guide")}${routeLink("/account", "Account")}</div></div></nav>`;
    requestAnimationFrame(() => overlayRoot.querySelector(".mobile-nav")?.classList.add("is-open"));
    document.body.classList.add("is-locked");
  }

  function openFilter() {
    state.activeOverlay = "filter";
    renderOverlayBase();
    overlayRoot.insertAdjacentHTML("beforeend", `<aside class="drawer filter-drawer"><div class="drawer__head"><h2>Filter products</h2><button class="icon-button" data-action="close-filter">${icon("close")}</button></div><div class="drawer__body"><div class="filter-section"><h3>Product type</h3><div class="check-list">${["T-Shirts","Hoodies","Crewnecks"].map((category) => `<label><input type="checkbox" data-filter-category value="${category}" ${state.filters.categories.includes(category) ? "checked" : ""}/> ${category}</label>`).join("")}</div></div><div class="filter-section"><h3>Availability</h3><div class="check-list"><label><input type="checkbox" data-filter-available ${state.filters.availableOnly ? "checked" : ""}/> In stock only</label></div></div><div class="filter-section"><h3>Price</h3><div class="check-list"><label><input type="checkbox" data-filter-under50 ${state.filters.under50 ? "checked" : ""}/> Under $50</label></div></div></div><div class="drawer__foot"><button class="btn btn--wide" data-action="apply-filters">Apply filters</button><button class="btn btn--wide btn--outline" style="margin-top:10px" data-action="reset-filters">Clear all</button></div></aside>`);
    requestAnimationFrame(() => { overlayRoot.querySelector(".overlay")?.classList.add("is-open"); overlayRoot.querySelector(".drawer")?.classList.add("is-open"); });
    document.body.classList.add("is-locked");
  }

  function closeAllOverlays(clear = true) {
    document.body.classList.remove("is-locked");
    if (clear) {
      state.activeOverlay = null;
      overlayRoot.innerHTML = "";
    }
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toastRoot.innerHTML = "";
    toastRoot.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    setTimeout(() => toast.classList.remove("is-visible"), 2600);
    setTimeout(() => toast.remove(), 3000);
  }

  document.addEventListener("click", (event) => {
    const route = event.target.closest("a[data-route]");
    if (route) {
      const href = route.getAttribute("href");
      if (href && href.startsWith("/")) {
        event.preventDefault();
        navigate(href);
        return;
      }
    }

    const actionNode = event.target.closest("[data-action]");
    if (!actionNode) return;
    const action = actionNode.dataset.action;

    if (action === "toggle-mega") {
      state.megaOpen = !state.megaOpen;
      document.getElementById("mega-menu")?.classList.toggle("is-open", state.megaOpen);
      actionNode.setAttribute("aria-expanded", String(state.megaOpen));
    }
    if (action === "open-cart") openCart();
    if (["close-cart","close-overlay","close-search","close-mobile","close-filter"].includes(action)) closeAllOverlays();
    if (action === "open-search") openSearch();
    if (action === "open-mobile") openMobile();
    if (action === "open-filter") openFilter();
    if (action === "quick-add") {
      event.preventDefault();
      event.stopPropagation();
      addToCart(actionNode.dataset.product, null, "M");
    }
    if (action === "select-size") {
      const view = actionNode.closest("[data-product-view]");
      view?.querySelectorAll(".size-button").forEach((btn) => btn.classList.remove("is-selected"));
      actionNode.classList.add("is-selected");
      const label = view?.querySelector("[data-selected-size]");
      if (label) label.textContent = actionNode.dataset.size;
    }
    if (action === "select-color") {
      const view = actionNode.closest("[data-product-view]");
      view?.querySelectorAll(".swatch").forEach((btn) => btn.classList.remove("is-selected"));
      actionNode.classList.add("is-selected");
      const label = view?.querySelector("[data-selected-color]");
      if (label) label.textContent = actionNode.dataset.color;
    }
    if (action === "add-product") {
      const view = actionNode.closest("[data-product-view]");
      const size = view?.querySelector(".size-button.is-selected")?.dataset.size || "M";
      const color = view?.querySelector(".swatch.is-selected")?.dataset.color;
      addToCart(actionNode.dataset.product, color, size);
    }
    if (action === "accordion") actionNode.closest(".accordion__item")?.classList.toggle("is-open");
    if (action === "qty-inc") modifyLine(actionNode.dataset.key, 1);
    if (action === "qty-dec") modifyLine(actionNode.dataset.key, -1);
    if (action === "remove-line") removeLine(actionNode.dataset.key);
    if (action === "apply-filters") {
      state.filters.categories = [...overlayRoot.querySelectorAll("[data-filter-category]:checked")].map((input) => input.value);
      state.filters.availableOnly = Boolean(overlayRoot.querySelector("[data-filter-available]:checked"));
      state.filters.under50 = Boolean(overlayRoot.querySelector("[data-filter-under50]:checked"));
      closeAllOverlays();
      render();
    }
    if (action === "reset-filters") {
      state.filters = { categories: [], availableOnly: false, under50: false };
      closeAllOverlays();
      render();
    }
    if (action === "demo-register") showToast("Account creation placeholder opened");
    if (action === "demo-order") showToast("Demo order confirmed — no payment was processed");
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches('select[data-action="sort"]')) {
      state.sort = event.target.value;
      render();
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.closest('[data-form="search-overlay"]')) updateOverlaySearch(event.target.value);
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    const type = form.dataset.form;
    if (type === "newsletter") {
      form.innerHTML = '<strong style="padding:18px 0">You’re on the list. Welcome to the night shift.</strong>';
      showToast("Newsletter signup saved in prototype");
    }
    if (type === "contact") {
      form.innerHTML = '<div class="callout field--full"><strong>Message received.</strong><br/>This is a prototype success state; no email was sent.</div>';
      showToast("Message received");
    }
    if (type === "tracking") {
      const result = document.getElementById("tracking-result");
      if (result) result.innerHTML = '<div class="callout"><strong>Status: In transit</strong><br/>Sample update: Your order left the Los Angeles fulfillment studio and is moving toward the destination hub.</div>';
    }
    if (type === "account") showToast("Login placeholder — no account service connected");
    if (type === "search-page") {
      const q = new FormData(form).get("q")?.toString() || "";
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
    if (type === "search-overlay") {
      const q = new FormData(form).get("q")?.toString() || "";
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllOverlays();
      state.megaOpen = false;
      document.getElementById("mega-menu")?.classList.remove("is-open");
    }
  });

  window.addEventListener("popstate", render);
  render();
})();
